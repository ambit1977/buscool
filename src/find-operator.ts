import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.ODPT_ACCESS_TOKEN;

async function main() {
  // 事業者一覧から国際興業を探す
  console.log('=== 事業者一覧から国際興業を検索 ===');
  const res = await axios.get('https://api.odpt.org/api/v4/odpt:Operator', {
    params: { 'acl:consumerKey': API_KEY }
  });
  const kokusai = res.data.filter((op: any) => 
    JSON.stringify(op).includes('国際興業') || JSON.stringify(op).toLowerCase().includes('kokusai')
  );
  console.log(JSON.stringify(kokusai, null, 2));

  // バス停を広く検索（事業者フィルタなし）
  console.log('\n=== 土支田一丁目 バス停を全事業者で検索 ===');
  const res2 = await axios.get('https://api.odpt.org/api/v4/odpt:BusstopPole', {
    params: {
      'dc:title': '土支田一丁目',
      'acl:consumerKey': API_KEY,
    }
  });
  console.log(`取得件数: ${res2.data.length}`);
  console.log(JSON.stringify(res2.data, null, 2));
}

main().catch(e => console.error(e.response?.status, e.response?.data || e.message));
