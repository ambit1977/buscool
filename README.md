# 🚌 BusCool — Alexa バス接近情報スキル

ナビタイムの[バス接近情報ページ](https://transfer-cloud.navitime.biz/5931bus?feature=busApproaching)をスクレイピングして、**次のバスの到着時間**をAlexaがお知らせする個人用スキルです。

> 「アレクサ、次のバスは」 → **「次のバスは9分後。2分遅れ。その次は23分後。」**

## ✨ 特徴

- 📡 **リアルタイム** — ナビタイムの接近情報ページから到着分数・遅延情報をリアルタイム取得
- 🗣️ **簡潔な発話** — 忙しい朝でもストレスのない短い応答
- 📺 **Echo Show 対応** — 画面付きデバイスではバス一覧をAPLで表示
- 🔧 **バス停変更可能** — 環境変数でバス停IDを設定するだけで他の区間にも対応

## 📁 プロジェクト構成

```
buscool/
├── src/
│   ├── index.ts          # Alexa スキルハンドラー (Lambda エントリポイント)
│   └── bus-service.ts    # スクレイピング・発話生成・表示データ生成
├── skill-package/
│   └── interactionModels/
│       └── custom/
│           └── ja-JP.json   # Alexa 対話モデル (日本語)
├── test-event.json       # Lambda テスト用イベント
├── .env.example          # 環境変数テンプレート
├── tsconfig.json
└── package.json
```

## 🚀 セットアップ

### 前提条件

- Node.js 22+
- AWS アカウント & AWS CLI（`aws login` で認証済み）
- [Amazon Developer アカウント](https://developer.amazon.com/)

### 1. クローン & インストール

```bash
git clone https://github.com/ambit1977/buscool.git
cd buscool
npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集し、バス停IDを設定します：

```env
# ナビタイムのバス停ID
# 接近情報ページのURL パラメータ departure-busstop / arrival-busstop から取得
# 例: https://transfer-cloud.navitime.biz/5931bus/approachings?departure-busstop=00020144&arrival-busstop=00020160
BUS_START_ID=00020144
BUS_GOAL_ID=00020160

# Echo Show表示用のバス停名
BUS_START_NAME=土支田一丁目
BUS_GOAL_NAME=成増一丁目
```

#### バス停IDの調べ方

1. [ナビタイム 国際興業バス 接近情報](https://transfer-cloud.navitime.biz/5931bus?feature=busApproaching) にアクセス
2. 乗車バス停と降車バス停を選択して検索
3. 結果ページのURLに含まれる `departure-busstop` と `arrival-busstop` がバス停IDです

### 3. AWS Lambda 関数の作成

```bash
# IAM ロールの作成
aws iam create-role \
  --role-name alexa-bus-kuru-lambda-role \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

aws iam attach-role-policy \
  --role-name alexa-bus-kuru-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Lambda 関数の作成
aws lambda create-function \
  --function-name alexa-bus-kuru \
  --runtime nodejs22.x \
  --architectures arm64 \
  --role "arn:aws:iam::<YOUR_ACCOUNT_ID>:role/alexa-bus-kuru-lambda-role" \
  --handler index.handler \
  --timeout 10 \
  --zip-file fileb://lambda-deploy.zip \
  --region ap-northeast-1

# Alexa からの呼び出し許可
aws lambda add-permission \
  --function-name alexa-bus-kuru \
  --statement-id alexa-skill-trigger \
  --action lambda:InvokeFunction \
  --principal alexa-appkit.amazon.com \
  --region ap-northeast-1

# 環境変数の設定
aws lambda update-function-configuration \
  --function-name alexa-bus-kuru \
  --region ap-northeast-1 \
  --environment '{"Variables":{"BUS_START_ID":"<YOUR_START_ID>","BUS_GOAL_ID":"<YOUR_GOAL_ID>","BUS_START_NAME":"<乗車バス停名>","BUS_GOAL_NAME":"<降車バス停名>"}}'
```

### 4. ビルド & デプロイ

```bash
# ビルド + ZIP作成 + Lambdaデプロイ（ワンコマンド）
npm run deploy:lambda
```

### 5. Alexa Developer Console の設定

1. [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask) でスキルを新規作成
   - スキル名：任意（例：「次のバスは」）
   - モデル：カスタム / 独自のプロビジョニング
2. **Interaction Model → JSON Editor** に `skill-package/interactionModels/custom/ja-JP.json` の内容を貼り付け
3. **Save → Build Model**
4. **Endpoint** に Lambda 関数の ARN を設定
5. **Test** タブで「開発中」に切り替えてテスト

### 6. テスト

```bash
# Lambda を直接テスト
aws lambda invoke \
  --function-name alexa-bus-kuru \
  --region ap-northeast-1 \
  --cli-binary-format raw-in-base64-out \
  --payload file://test-event.json \
  /tmp/response.json && cat /tmp/response.json | python3 -m json.tool
```

## 🔧 カスタマイズ

### 呼び出し名の変更

`skill-package/interactionModels/custom/ja-JP.json` の `invocationName` を変更します：

```json
"invocationName": "バス情報"
```

変更後、Alexa Developer Console で JSON を再インポートして Build してください。

### 発話サンプルの追加

同じ JSON ファイルの `GetNextBusIntent` > `samples` 配列に、ユーザーが言いそうなフレーズを追加できます。

## 🏗️ 技術スタック

| 項目 | 技術 |
|---|---|
| 言語 | TypeScript |
| ランタイム | Node.js 22 (AWS Lambda) |
| データ取得 | axios + cheerio (HTML スクレイピング) |
| Alexa SDK | ask-sdk-core |
| 画面表示 | APL (Alexa Presentation Language) |
| デプロイ | AWS Lambda (arm64) |

## ⚠️ 注意事項

- ナビタイムのページ構造が変更された場合、`bus-service.ts` のセレクタ修正が必要です
- スクレイピングのため、ナビタイム側の仕様変更で動作しなくなる可能性があります
- 個人利用を想定しています。大量リクエストは控えてください
- AWS Lambda の無料枠（月100万リクエスト）内で運用可能です

## 📄 ライセンス

[MIT](LICENSE)
