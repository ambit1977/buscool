/**
 * 国際興業バス リアルタイム接近情報取得モジュール
 * ナビタイムの接近情報ページをスクレイピングしてバス情報を取得する
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const BUS_LOCATION_URL = 'https://transfer.navitime.biz/5931bus/pc/location/BusLocationResult';

export interface BusInfo {
  routeName: string;            // 系統名 (例: "石03")
  destination: string;          // 行き先 (例: "成増駅南口経由練馬北町車庫ゆき")
  scheduledTime: string;        // 定刻 (例: "09:45")
  minutesToArrival: number | null; // 到着まで何分 (例: 9)
  delay: string;                // 遅れ情報 (例: "(約1分の遅れ)" や "(遅れなし)")
  currentPosition: string;      // 現在位置 (例: "7個前の停留所を発車")
}

/**
 * 指定した区間のバス接近情報を取得する
 * @param startId 乗車バス停ID (ナビタイム固有)
 * @param goalId  降車バス停ID (ナビタイム固有)
 */
export async function fetchBusInfo(startId: string, goalId: string): Promise<BusInfo[]> {
  const res = await axios.get(BUS_LOCATION_URL, {
    params: { startId, goalId },
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AlexaBusSkill/1.0)',
    },
    timeout: 5000,
  });

  const $ = cheerio.load(res.data);
  const buses: BusInfo[] = [];

  $('a.locationData, li.plotList a').each((_, el) => {
    const block = $(el);
    const text = block.text();

    const routeNameEl = block.find('.courseName');
    const routeName = routeNameEl.length ? routeNameEl.text().trim() : '';

    const destinationEl = block.find('.destination-name');
    const destination = destinationEl.length ? destinationEl.text().trim() : '';

    const onTimeEl = block.find('.on-time');
    const scheduledTime = onTimeEl.length ? onTimeEl.text().replace('定刻', '').trim() : '';

    const minutesMatch = text.match(/約\s*(\d+)\s*分後に到着/);
    const minutesToArrival = minutesMatch ? parseInt(minutesMatch[1], 10) : null;

    const delayMatch = text.match(/\(([^)]*遅[^)]*)\)/);
    const delay = delayMatch ? delayMatch[0] : '';

    const positionMatch = text.match(/(\d+個前の停留所を発車|始発バス停出発前)/);
    const currentPosition = positionMatch ? positionMatch[0] : '';

    if (routeName || scheduledTime) {
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
 * Alexaの発話テキストを生成する
 */
export function buildSpeechText(buses: BusInfo[]): string {
  if (buses.length === 0) {
    return '現在、バスの接近情報はありません。しばらくしてからもう一度お試しください。';
  }

  const first = buses[0];
  let speech = '';

  if (first.minutesToArrival !== null) {
    speech = `次のバスは${first.routeName}、${simplifyDestination(first.destination)}で、約${first.minutesToArrival}分後に到着予定です。`;
    if (first.delay && !first.delay.includes('遅れなし')) {
      speech += `${first.delay.replace(/[()（）]/g, '')}。`;
    }
  } else {
    speech = `次のバスは${first.routeName}、${simplifyDestination(first.destination)}で、定刻${first.scheduledTime}発です。`;
  }

  // 2本目がある場合は追加情報
  if (buses.length >= 2) {
    const second = buses[1];
    if (second.minutesToArrival !== null) {
      speech += `その次は${second.routeName}、約${second.minutesToArrival}分後です。`;
    } else {
      speech += `その次は${second.routeName}、定刻${second.scheduledTime}発です。`;
    }
  }

  return speech;
}

/**
 * 行き先名を音声用に簡略化する
 * 例: "成増駅南口経由練馬北町車庫ゆき" → "成増駅南口方面"
 */
function simplifyDestination(destination: string): string {
  // "成増駅南口" を含む場合は簡略化
  if (destination.includes('成増駅南口')) {
    return '成増駅南口方面';
  }
  // "ゆき" を "行き" に統一
  return destination.replace(/ゆき$/, '行き');
}
