import * as Alexa from 'ask-sdk-core';
import { fetchBusInfo, buildSpeechText, buildDisplayData } from './bus-service';

// --- 設定（環境変数から取得） ---
const START_ID = process.env.BUS_START_ID || '';
const GOAL_ID = process.env.BUS_GOAL_ID || '';

// --- Echo Show用 APLドキュメント ---
const APL_DOCUMENT = {
  type: 'APL',
  version: '2024.3',
  mainTemplate: {
    parameters: ['payload'],
    items: [
      {
        type: 'Container',
        width: '100%',
        height: '100%',
        padding: 20,
        items: [
          {
            type: 'Text',
            text: '${payload.title}',
            style: 'textStyleDisplay4',
            fontWeight: 'bold',
            fontSize: 28,
            color: '#FFFFFF',
            paddingBottom: 16,
          },
          {
            type: 'Sequence',
            width: '100%',
            grow: 1,
            data: '${payload.items}',
            items: [
              {
                type: 'Container',
                width: '100%',
                paddingTop: 8,
                paddingBottom: 8,
                items: [
                  {
                    type: 'Text',
                    text: '${data.line}',
                    fontSize: 24,
                    color: '#FFFFFF',
                  },
                ],
                separator: true,
              },
            ],
          },
        ],
      },
    ],
  },
};

// --- バス情報を取得して応答を返す共通関数 ---
async function handleBusRequest(handlerInput: Alexa.HandlerInput) {
  try {
    const buses = await fetchBusInfo(START_ID, GOAL_ID);
    const speakOutput = buildSpeechText(buses);
    const displayData = buildDisplayData(buses);

    const builder = handlerInput.responseBuilder.speak(speakOutput);

    // Echo Showなど画面付きデバイスの場合はAPLを表示
    if (
      Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']
    ) {
      builder.addDirective({
        type: 'Alexa.Presentation.APL.RenderDocument',
        version: '1.0',
        document: APL_DOCUMENT,
        datasources: {
          payload: displayData,
        },
      } as any);
    }

    // 画面なしデバイス向けにシンプルカードも追加
    const cardText = displayData.items.map((i) => i.line).join('\n');
    builder.withSimpleCard(displayData.title, cardText);

    return builder.getResponse();
  } catch (error) {
    console.error('Error fetching bus info:', error);
    return handlerInput.responseBuilder
      .speak('情報の取得に失敗しました。')
      .getResponse();
  }
}

// --- LaunchRequestHandler ---
const LaunchRequestHandler: Alexa.RequestHandler = {
  canHandle(handlerInput: Alexa.HandlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle: handleBusRequest,
};

// --- GetNextBusIntentHandler ---
const GetNextBusIntentHandler: Alexa.RequestHandler = {
  canHandle(handlerInput: Alexa.HandlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetNextBusIntent';
  },
  handle: handleBusRequest,
};

// --- HelpIntentHandler ---
const HelpIntentHandler: Alexa.RequestHandler = {
  canHandle(handlerInput: Alexa.HandlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput: Alexa.HandlerInput) {
    return handlerInput.responseBuilder
      .speak('次のバスの到着時刻を調べます。')
      .reprompt('次のバスの到着時刻を調べます。')
      .getResponse();
  }
};

// --- CancelAndStopIntentHandler ---
const CancelAndStopIntentHandler: Alexa.RequestHandler = {
  canHandle(handlerInput: Alexa.HandlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
        || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
  },
  handle(handlerInput: Alexa.HandlerInput) {
    return handlerInput.responseBuilder.getResponse();
  }
};

// --- SessionEndedRequestHandler ---
const SessionEndedRequestHandler: Alexa.RequestHandler = {
  canHandle(handlerInput: Alexa.HandlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput: Alexa.HandlerInput) {
    return handlerInput.responseBuilder.getResponse();
  }
};

// --- ErrorHandler ---
const ErrorHandler: Alexa.ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput: Alexa.HandlerInput, error: Error) {
    console.error(`Error: ${error.stack}`);
    return handlerInput.responseBuilder
      .speak('エラーが発生しました。')
      .getResponse();
  }
};

// --- Lambda エントリポイント ---
export const handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    GetNextBusIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
