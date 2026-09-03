/**
 * 国際興業バス リアルタイム接近情報取得モジュール
 * ナビタイムの接近情報ページ（新クラウド版）をスクレイピングしてバス情報を取得する
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

// 2026年9月リニューアル後の新URL
const BUS_LOCATION_URL = 'https://transfer-cloud.navitime.biz/5931bus/approachings';

export interface BusInfo {
  routeName: string;            // 系統名 (例: "石02")
  destination: string;          // 行き先 (例: "成増駅南口行")
  scheduledTime: string;        // 定刻 (例: "11:44")
  minutesToArrival: number | null; // 到着まで何分 (例: 2)
  delay: string;                // 遅れ情報 (例: "約3分遅れ" や "遅れなし")
  currentPosition: string;      // 現在位置 (例: "3個前のバス停から接近中")
}

/**
 * 指定した区間のバス接近情報を取得する
 * @param startId 乗車バス停ID (ナビタイム固有)
 * @param goalId  降車バス停ID (ナビタイム固有)
 */
export async function fetchBusInfo(startId: string, goalId: string): Promise<BusInfo[]> {
  const res = await axios.get(BUS_LOCATION_URL, {
    params: {
      'departure-busstop': startId,
      'arrival-busstop': goalId,
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ja,en;q=0.9',
    },
    timeout: 7000,
  });

  const $ = cheerio.load(res.data);
  const buses: BusInfo[] = [];

  // 新ナビタイムサイトの各バスカードは button 要素
  $('button').each((_, el) => {
    const btn = $(el);
    const h3 = btn.find('h3');
    if (!h3.length) return;

    const h3Text = h3.text().trim();
    if (!h3Text) return;

    const fullText = btn.text().replace(/\s+/g, ' ');

    // 系統名と行き先（例: "石02成増駅南口行"）
    let routeName = '';
    let destination = h3Text;
    const match = h3Text.match(/^([A-Za-z0-9\u4e00-\u9fa5]+?\d+)(.*)$/);
    if (match) {
      routeName = match[1];
      destination = match[2];
    }

    // 到着まで何分（例: "あと約 2 分で 到着" または "あと約 1 時間 2 分で 到着"）
    let minutesToArrival: number | null = null;
    const hourMinMatch = fullText.match(/あと約\s*(\d+)\s*時間\s*(\d+)\s*分/);
    const minMatch = fullText.match(/あと約\s*(\d+)\s*分/);
    if (hourMinMatch) {
      minutesToArrival = parseInt(hourMinMatch[1], 10) * 60 + parseInt(hourMinMatch[2], 10);
    } else if (minMatch) {
      minutesToArrival = parseInt(minMatch[1], 10);
    }

    // 遅延情報（例: "約3分遅れ" または "遅れなし"）
    let delay = '';
    const delayMatch = fullText.match(/(約\d+分遅れ|遅れなし)/);
    if (delayMatch) {
      delay = delayMatch[1];
    }

    // 乗車バス停側の定刻（例: "定刻 11:44"）
    let scheduledTime = '';
    const schedMatch = fullText.match(/定刻\s*(\d{1,2}:\d{2})/);
    if (schedMatch) {
      scheduledTime = schedMatch[1];
    }

    // 現在位置（例: "3個前のバス停から接近中" または "始発バス停...発車前"）
    let currentPosition = '';
    const posMatch = fullText.match(/(\d+個前のバス停から接近中|始発バス停[^\s]*発車前)/);
    if (posMatch) {
      currentPosition = posMatch[1];
    }

    if (routeName || scheduledTime || minutesToArrival !== null) {
      buses.push({
        routeName,
        destination,
        scheduledTime,
        minutesToArrival,
        delay,
        currentPosition,
      });
    }
  });

  return buses;
}

/**
 * Alexaの発話テキストを生成する（簡潔版）
 */
export function buildSpeechText(buses: BusInfo[]): string {
  if (buses.length === 0) {
    return 'バスの情報はありません。';
  }

  const first = buses[0];
  let speech = '';

  if (first.minutesToArrival !== null) {
    speech = `次のバスは${first.minutesToArrival}分後。`;
    if (first.delay && !first.delay.includes('遅れなし')) {
      const delayMin = first.delay.match(/(\d+)/);
      speech += delayMin ? `${delayMin[1]}分遅れ。` : '';
    }
  } else if (first.scheduledTime) {
    speech = `次のバスは${first.scheduledTime}発。`;
  } else {
    speech = '次のバスの時刻は不明です。';
  }

  if (buses.length >= 2) {
    const second = buses[1];
    if (second.minutesToArrival !== null) {
      speech += `その次は${second.minutesToArrival}分後。`;
    } else if (second.scheduledTime) {
      speech += `その次は${second.scheduledTime}発。`;
    }
  }

  return speech;
}

/**
 * Echo Show用の表示データを生成する
 */
export function buildDisplayData(buses: BusInfo[]): { title: string; items: { line: string }[] } {
  const items = buses.slice(0, 5).map((bus) => {
    let line = `${bus.routeName} ${bus.scheduledTime}`;
    if (bus.minutesToArrival !== null) {
      line += ` → 約${bus.minutesToArrival}分後`;
    }
    if (bus.delay && !bus.delay.includes('遅れなし')) {
      line += ` ${bus.delay}`;
    }
    return { line };
  });
  const startName = process.env.BUS_START_NAME || '乗車';
  const goalName = process.env.BUS_GOAL_NAME || '降車';
  return { title: `${startName} → ${goalName}`, items };
}
