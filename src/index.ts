import * as Alexa from 'ask-sdk-core';
import { fetchBusInfo, buildSpeechText } from './bus-service';

// --- 設定 ---
// 土支田一丁目 → 成増一丁目
const START_ID = '00020144';
const GOAL_ID = '00020160';

// --- LaunchRequestHandler ---
// 「アレクサ、バスくるを開いて」でスキルが起動されたとき
// → 直接バス情報を返す（ワンショット対応）
const LaunchRequestHandler: Alexa.RequestHandler = {
  canHandle(handlerInput: Alexa.HandlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  async handle(handlerInput: Alexa.HandlerInput) {
    try {
      const buses = await fetchBusInfo(START_ID, GOAL_ID);
      const speakOutput = buildSpeechText(buses);

      return handlerInput.responseBuilder
        .speak(speakOutput)
        .getResponse();
    } catch (error) {
      console.error('Error in LaunchRequest:', error);
      return handlerInput.responseBuilder
        .speak('バスの情報の取得に失敗しました。しばらくしてからもう一度お試しください。')
        .getResponse();
    }
  }
};

// --- GetNextBusIntentHandler ---
// 「次のバスは？」と聞かれたとき
const GetNextBusIntentHandler: Alexa.RequestHandler = {
  canHandle(handlerInput: Alexa.HandlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetNextBusIntent';
  },
  async handle(handlerInput: Alexa.HandlerInput) {
    try {
      const buses = await fetchBusInfo(START_ID, GOAL_ID);
      const speakOutput = buildSpeechText(buses);

      return handlerInput.responseBuilder
        .speak(speakOutput)
        .getResponse();
    } catch (error) {
      console.error('Error in GetNextBusIntent:', error);
      return handlerInput.responseBuilder
        .speak('バスの情報の取得に失敗しました。しばらくしてからもう一度お試しください。')
        .getResponse();
    }
  }
};

// --- HelpIntentHandler ---
const HelpIntentHandler: Alexa.RequestHandler = {
  canHandle(handlerInput: Alexa.HandlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput: Alexa.HandlerInput) {
    const speakOutput = '土支田一丁目から成増一丁目方面の次のバスの到着時刻を調べます。「次のバスは？」と聞いてください。';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
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
    return handlerInput.responseBuilder
      .speak('さようなら')
      .getResponse();
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
    console.error(`Error handled: ${error.stack}`);
    return handlerInput.responseBuilder
      .speak('エラーが発生しました。もう一度やり直してください。')
      .reprompt('もう一度やり直してください。')
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
