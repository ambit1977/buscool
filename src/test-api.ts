/**
 * ODPT API テストスクリプト
 * 国際興業バス「土支田一丁目」バス停の情報を取得して確認する
 * 
 * 実行: npx ts-node src/test-api.ts
 */
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const API_BASE = 'https://api.odpt.org/api/v4';
const API_KEY = process.env.ODPT_ACCESS_TOKEN;

if (!API_KEY) {
  console.error('❌ ODPT_ACCESS_TOKEN が .env に設定されていません');
  process.exit(1);
}

async function testBusstopPole() {
  console.log('=== 1. バス停検索: 土支田 ===');
  const url = `${API_BASE}/odpt:BusstopPole`;
  const res = await axios.get(url, {
    params: {
      'odpt:operator': 'odpt.Operator:KokusaiKogyoBus',
      'dc:title': '土支田一丁目',
      'acl:consumerKey': API_KEY,
    },
  });
  console.log(`取得件数: ${res.data.length}`);
  console.log(JSON.stringify(res.data, null, 2));
  return res.data;
}

async function testBusTimetable(busstopPoleId: string) {
  console.log(`\n=== 2. 時刻表検索: ${busstopPoleId} ===`);
  const url = `${API_BASE}/odpt:BusTimetable`;
  const res = await axios.get(url, {
    params: {
      'odpt:operator': 'odpt.Operator:KokusaiKogyoBus',
      'odpt:busstopPole': busstopPoleId,
      'acl:consumerKey': API_KEY,
    },
  });
  console.log(`取得件数: ${res.data.length}`);
  // 最初の1件だけ詳細表示
  if (res.data.length > 0) {
    console.log('--- 最初の1件 ---');
    console.log(JSON.stringify(res.data[0], null, 2));
  }
  return res.data;
}

async function testBusLocation() {
  console.log('\n=== 3. バスロケーション（リアルタイム位置情報） ===');
  const url = `${API_BASE}/odpt:Bus`;
  const res = await axios.get(url, {
    params: {
      'odpt:operator': 'odpt.Operator:KokusaiKogyoBus',
      'acl:consumerKey': API_KEY,
    },
  });
  console.log(`取得件数: ${res.data.length}`);
  // 最初の3件だけ表示
  if (res.data.length > 0) {
    console.log('--- 最初の3件 ---');
    console.log(JSON.stringify(res.data.slice(0, 3), null, 2));
  }
  return res.data;
}

async function main() {
  try {
    // 1. バス停情報の取得
    const busstops = await testBusstopPole();

    // 2. バス停が見つかったら時刻表を取得
    if (busstops.length > 0) {
      const busstopId = busstops[0]['owl:sameAs'] || busstops[0]['@id'];
      await testBusTimetable(busstopId);
    }

    // 3. バスのリアルタイム位置情報を取得
    await testBusLocation();

    console.log('\n✅ テスト完了');
  } catch (error: any) {
    console.error('❌ APIエラー:', error.response?.status, error.response?.data || error.message);
  }
}

main();
