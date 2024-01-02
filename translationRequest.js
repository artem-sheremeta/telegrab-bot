const axios = require("axios").default;
const { v4: uuidv4 } = require("uuid");
const { addWordToDatabase } = require("./databaseOperations");
const { getPaginatedLanguages, getFlagEmoji } = require("./buttonHandlers");

const key = "e8fd5f7c085f4fba97d6bae1ce427256";
const location = "westeurope";
const endpoint = "https://api.cognitive.microsofttranslator.com";

//function for translate text
async function handleTranslation(bot, chatId, text, userContext, username) {
  try {
    const toLanguage = userContext[chatId].selectedLanguage || "uk";
    const translationResponse = await axios({
      baseURL: endpoint,
      url: "/translate",
      method: "post",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Ocp-Apim-Subscription-Region": location,
        "Content-type": "application/json",
        "X-ClientTraceId": uuidv4().toString(),
      },
      params: {
        "api-version": "3.0",
        to: toLanguage,
      },
      data: [
        {
          text: text,
        },
      ],
      responseType: "json",
    });
    const translatedText = translationResponse.data[0].translations[0].text;
    addWordToDatabase(
      chatId,
      username,
      text,
      userContext[chatId].selectNameLanguage,
      translatedText
    );
    bot.sendMessage(chatId, `Переклад: ${translatedText}`);
  } catch (error) {
    console.error("Error translating text:", error);
    bot.sendMessage(chatId, "Виникла помилка під час перекладу.");
  }
}

//function for define language the text
async function handleDefineLanguages(bot, chatId, text, userContext) {
  if (!userContext[chatId] || !userContext[chatId].availableLanguages) {
    bot.sendMessage(chatId, "Список мов ще не завантажений.");
    return;
  }
  if (userContext[chatId] && userContext[chatId].awaitingLanguageDetection) {
    try {
      const selectLanguage = await axios({
        baseURL: endpoint,
        url: "/detect",
        method: "post",
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          // location required if you're using a multi-service or regional (not global) resource.
          "Ocp-Apim-Subscription-Region": location,
          "Content-type": "application/json",
          "X-ClientTraceId": uuidv4().toString(),
        },
        params: {
          "api-version": "3.0",
        },
        data: [
          {
            text: text,
          },
        ],
        responseType: "json",
      });
      const detectedLanguageCode = selectLanguage.data[0].language;
      if (userContext[chatId].availableLanguages[detectedLanguageCode]) {
        const detectedLanguageName =
          userContext[chatId].availableLanguages[detectedLanguageCode].name;
        bot.sendMessage(chatId, `Виявлена мова: ${detectedLanguageName}`);
      } else {
        bot.sendMessage(chatId, "Виявлена мова не підтримується.");
      }
    } catch (error) {
      console.error(`Error current language ${error}`);
      bot.sendMessage(chatId, "Виникла помилка під час виявлення мови.");
    }
  }
}

//function for get list languages
async function fetchLanguagesList() {
  try {
    const response = await axios({
      baseURL: endpoint,
      url: "/languages",
      method: "get",
      params: { "api-version": "3.0" },
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Ocp-Apim-Subscription-Region": location,
        "Content-Type": "application/json",
      },
    });
    return response.data.translation;
  } catch (error) {
    console.error("Error fetching supported languages:", error);
    return null;
  }
}

//function for create inline keyboards
async function getListLanguages(
  bot,
  chatId,
  userContext,
  returnOnlyData = false
) {
  try {
    const languagesList = await fetchLanguagesList();
    if (!languagesList) {
      throw new Error("Unable to fetch languages list.");
    }

    userContext[chatId] = {
      ...userContext[chatId],
      availableLanguages: languagesList,
      awaitingLanguageChoice: true,
    };

    const currentPage = userContext[chatId].currentPage || 0;
    const pageSize = 20;
    const paginatedLanguages = getPaginatedLanguages(
      Object.entries(languagesList),
      currentPage,
      pageSize
    );

    const languagesButtons = paginatedLanguages.map(([code, { name }]) => {
      const flagEmoji = getFlagEmoji(code);
      return { text: `${flagEmoji} ${name}`, callback_data: `lang_${code}` };
    });

    const rowsOfLanguages = [];
    for (let i = 0; i < languagesButtons.length; i += 2) {
      rowsOfLanguages.push(languagesButtons.slice(i, i + 2));
    }

    const navigationButtons = [];
    if (currentPage > 0) {
      navigationButtons.push({ text: "⬅️", callback_data: "prev_page" });
    }
    if ((currentPage + 1) * pageSize < Object.keys(languagesList).length) {
      navigationButtons.push({ text: "➡️", callback_data: "next_page" });
    }

    const inlineKeyboard = [...rowsOfLanguages, navigationButtons];
    const text = "<b>Виберіть мову:</b>";
    const keyboard = {
      reply_markup: {
        inline_keyboard: inlineKeyboard,
      },
    };

    if (returnOnlyData) {
      return { text, keyboard };
    } else {
      bot.sendMessage(chatId, text, { parse_mode: "HTML", ...keyboard });
    }
  } catch (error) {
    console.error("Error in getListLanguages:", error);
    if (!returnOnlyData) {
      bot.sendMessage(chatId, "Виникла помилка.");
    }
  }
}

//function get list language for define language the text
async function getLanguages(bot, chatId, userContext) {
  try {
    const response = await axios({
      baseURL: endpoint,
      url: "/languages",
      method: "get",
      params: {
        "api-version": "3.0",
      },
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Ocp-Apim-Subscription-Region": location,
        "Content-Type": "application/json",
      },
    });

    const languages = response.data.translation;
    userContext[chatId] = {
      ...userContext[chatId],
      availableLanguages: languages,
      awaitingLanguageChoice: false,
    };
  } catch (error) {
    console.error("Error fetching supported languages:", error);
    bot.sendMessage(chatId, "Виникла помилка під час отримання списку мов.");
  }
}

module.exports = {
  handleTranslation,
  handleDefineLanguages,
  getListLanguages,
  getLanguages,
};
