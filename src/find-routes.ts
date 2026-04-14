import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.ODPT_ACCESS_TOKEN;

async function main() {
  // 土支田一丁目に紐づくバス路線パターンの詳細を調べる
  const routePatterns = [
    'odpt.BusroutePattern:SeibuBus.DoshidaJunkan.8001.1',
    'odpt.BusroutePattern:SeibuBus.Nerima01.64002.1',
    'odpt.BusroutePattern:SeibuBus.Ishi02.56001.1',
    'odpt.BusroutePattern:SeibuBus.Ishi04.56011.1',
    'odpt.BusroutePattern:SeibuBus.Nerima01.64002.2',
    'odpt.BusroutePattern:SeibuBus.Nerima03.64004.2',
    'odpt.BusroutePattern:SeibuBus.Ishi02.56001.2',
    'odpt.BusroutePattern:SeibuBus.Ishi04.56011.2',
  ];

  for (const pattern of routePatterns) {
    console.log(`\n=== ${pattern} ===`);
    const res = await axios.get('https://api.odpt.org/api/v4/odpt:BusroutePattern', {
      params: {
        'owl:sameAs': pattern,
        'acl:consumerKey': API_KEY,
      }
    });
    if (res.data.length > 0) {
      const route = res.data[0];
      console.log(`路線名: ${route['dc:title']}`);
      console.log(`方向: ${route['odpt:direction']}`);
      // バス停一覧から主要な停車バス停を表示
      const stops = route['odpt:busstopPoleOrder'] || [];
      const stopNames = stops.map((s: any) => s['odpt:note'] || s['odpt:busstopPole']);
      console.log(`停車バス停 (${stops.length}): ${stopNames.join(' → ')}`);
    }
  }

  // 成増のバス停も検索
  console.log('\n\n=== 成増 バス停を検索 ===');
  const res2 = await axios.get('https://api.odpt.org/api/v4/odpt:BusstopPole', {
    params: {
      'dc:title': '成増駅南口',
      'acl:consumerKey': API_KEY,
    }
  });
  console.log(`取得件数: ${res2.data.length}`);
  for (const stop of res2.data) {
    console.log(`  ${stop['owl:sameAs']} - ${stop['odpt:operator']}`);
  }
}

main().catch(e => console.error(e.response?.status, e.response?.data || e.message));
