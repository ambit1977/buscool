/**
 * スクレイピングテスト
 * ナビタイムの国際興業バス接近情報ページからデータを取得・パースする
 * 
 * 実行: npx ts-node src/test-scrape.ts
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

const BUS_LOCATION_URL = 'https://transfer.navitime.biz/5931bus/pc/location/BusLocationResult';

interface BusInfo {
  routeName: string;       // 系統名 (例: "石03")
  destination: string;     // 行き先 (例: "成増駅南口経由練馬北町車庫ゆき")
  scheduledTime: string;   // 定刻 (例: "09:45")
  minutesToArrival: number | null; // 到着まで何分 (例: 9)
  delay: string;           // 遅れ情報 (例: "(約1分の遅れ)" や "(遅れなし)")
  currentPosition: string; // 現在位置 (例: "7個前の停留所を発車" や "始発バス停出発前")
}

async function fetchBusInfo(startId: string, goalId: string): Promise<BusInfo[]> {
  const res = await axios.get(BUS_LOCATION_URL, {
    params: { startId, goalId },
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AlexaBusSkill/1.0)',
    },
  });

  const $ = cheerio.load(res.data);
  const buses: BusInfo[] = [];

  // 各バス情報ブロックを取得
  // ページの構造: <li class="plotList"> > <a class="locationData"> の中にデータ
  $('a.locationData, li.plotList a').each((_, el) => {
    const block = $(el);
    const text = block.text();

    // 系統名を取得
    const routeNameEl = block.find('.courseName');
    const routeName = routeNameEl.length ? routeNameEl.text().trim() : '';

    // 行き先
    const destinationEl = block.find('.destination-name');
    const destination = destinationEl.length ? destinationEl.text().trim() : '';

    // 定刻
    const onTimeEl = block.find('.on-time');
    const scheduledTime = onTimeEl.length ? onTimeEl.text().replace('定刻', '').trim() : '';

    // 到着までの分数
    const minutesMatch = text.match(/約\s*(\d+)\s*分後に到着/);
    const minutesToArrival = minutesMatch ? parseInt(minutesMatch[1], 10) : null;

    // 遅延情報
    const delayMatch = text.match(/\(([^)]*遅[^)]*)\)/);
    const delay = delayMatch ? delayMatch[0] : '';

    // 現在位置
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

async function main() {
  console.log('=== 国際興業バス 接近情報スクレイピングテスト ===');
  console.log('区間: 土支田一丁目 → 成増一丁目\n');

  const buses = await fetchBusInfo('00020144', '00020160');

  if (buses.length === 0) {
    console.log('バス情報が取得できませんでした。');
    return;
  }

  console.log(`取得件数: ${buses.length}\n`);

  buses.forEach((bus, i) => {
    console.log(`--- バス ${i + 1} ---`);
    console.log(`  系統: ${bus.routeName}`);
    console.log(`  行き先: ${bus.destination}`);
    console.log(`  定刻: ${bus.scheduledTime}`);
    console.log(`  到着: ${bus.minutesToArrival !== null ? `約${bus.minutesToArrival}分後` : '不明'}`);
    console.log(`  遅れ: ${bus.delay}`);
    console.log(`  現在地: ${bus.currentPosition}`);
    console.log('');
  });

  // Alexaが話す形式でのサンプル出力
  if (buses[0]) {
    const b = buses[0];
    const speechText = b.minutesToArrival !== null
      ? `次のバスは${b.routeName}、${b.destination}で、約${b.minutesToArrival}分後に到着予定です。${b.delay}。`
      : `次のバスは${b.routeName}、${b.destination}で、定刻${b.scheduledTime}発です。`;
    console.log('=== Alexa発話サンプル ===');
    console.log(speechText);
  }
}

main().catch(e => console.error('Error:', e.message));
