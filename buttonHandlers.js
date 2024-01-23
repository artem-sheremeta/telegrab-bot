const menu = {
  mainMenu: [
    ["Interpreter 🔁", "Define the language 🔍"],
    ["Test 📝", "Info ℹ️"],
  ],
  languageSelection: [
    ["Ukrainian 🇺🇦", "English 🏴󠁧󠁢󠁥󠁮󠁧󠁿"],
    ["Select another language 🌐", " ⬅️ Back"],
  ],

  translationOptions: [["Continue learning words 📚", "⬅️ Back"]],
  defineLanguageText: [["Language the text 🔍", "⬅️ Back"]],
  learningWords: [
    ["Delete words 🗑️", "Continue learning words 📚"],
    ["⬅️ Back"],
  ],
};

const takeButtons = (currentKey) => menu[currentKey];

const setKey = (value, userContext) => {
  userContext.currentKey = value;
};

function back(currentKey) {
  switch (currentKey) {
    case "translationOptions":
      return "languageSelection";
    case "languageSelection":
      return "mainMenu";
    case "additionalOptions":
      return "languageSelection";
    case "defineLanguageText":
      return "mainMenu";
    case "learningWords":
      return "translationOptions";
    default:
      return "mainMenu";
  }
}

//function for button and command "start"
function clickStart(bot, msg, userContext) {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || "Друг";
  const currentKey = "mainMenu";
  setKey(currentKey, userContext);
  const buttons = takeButtons(currentKey);
  if (userContext[chatId]) {
    userContext[chatId].translate = false;
    userContext[chatId].awaitingLanguageChoice = false;
    userContext[chatId].awaitingLanguageDetection = false;
    userContext[chatId].currentQuestion = false;
  }
  bot.sendMessage(
    chatId,
    `Привіт, ${name}! 👋\nВиберіть опцію в Головному меню ⬇️`,
    {
      reply_markup: {
        keyboard: buttons,
        resize_keyboard: true,
      },
    }
  );
}

//function for button and command "back"
function clickBack(bot, msg, userContext) {
  const chatId = msg.chat.id;
  const currentKey = back(userContext.currentKey);
  setKey(currentKey, userContext);
  const buttons = takeButtons(currentKey);
  if (userContext[chatId]) {
    userContext[chatId].translate = false;
    userContext[chatId].awaitingLanguageChoice = false;
    userContext[chatId].awaitingLanguageDetection = false;
    userContext[chatId].currentQuestion = false;
  }

  if (userContext.currentKey === "translationOptions") {
    userContext[chatId].translate = true;
  }
  bot.sendMessage(chatId, "⬅️ Повернення до попереднього меню... ⬅️", {
    reply_markup: {
      keyboard: buttons,
      resize_keyboard: true,
    },
  });
}

//function for button "interpreter"
function clickInterpreter(bot, msg, userContext) {
  const chatId = msg.chat.id;
  const currentKey = "languageSelection";
  setKey(currentKey, userContext);
  const buttons = takeButtons(currentKey);
  bot.sendMessage(chatId, "Виберіть мову для перекладу:", {
    reply_markup: {
      keyboard: buttons,
      resize_keyboard: true,
    },
  });
}

//function for button and command "define the language"
function clickDefineLanguageText(bot, msg, userContext) {
  const chatId = msg.chat.id;
  const currentKey = "defineLanguageText";
  setKey(currentKey, userContext);
  const buttons = takeButtons(currentKey);
  bot.sendMessage(
    chatId,
    "Нажміть на 'Language the text 🔍', щоб визначити мову тексту",
    {
      reply_markup: {
        keyboard: buttons,
        resize_keyboard: true,
      },
    }
  );
}

//function for button and command "info"
function clickInfo(bot, msg) {
  const chatId = msg.chat.id;
  const response = `Вітаю ${msg.from.first_name}!
  
  Я допоможу тобі перекласти будьяке слово або текст і вивчити будьяку мову.
  
  Ось кілька відомих мені команд:
  ℹ️ /info - Покаже це повідомлення;
  ▶️ /start - Відкриє головне меню;
  ⬅️ /back - Повертає попереднє меню;
  🔤 /translate - Перекладе вам будьяке слово або текст на мову яку ви оберете(бот сам визначає мову на якій ви йому пишете);
  🔍 /define - Допоможе вам визначити мову на якій написаний текст;
  🌐 /languages - Покаже список доступних мені мов
  
  🧠 Слова, які ви перекладаєте запам'ятовуються у базу даних, коли ви оберете мову у вас буде кнопка "Continue learning words 📚", натиснувши на неї ви зможете вивчати слова та слововсполучення, які ви перекладали, але не великі за об'ємом тексти або речення! 🤔`;
  bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
}

//function button "ukrainian and english"
function clickLanguageSelection(bot, chatId, userContext) {
  const currentKey = "translationOptions";
  const buttons = takeButtons(currentKey);
  if (userContext[chatId] && userContext[chatId].selectedLanguage) {
    userContext[chatId].translate = true;
    bot.sendMessage(
      chatId,
      `Ви обрали мову: ${userContext[chatId].selectNameLanguage}, Введіть текст для перекладу ✏️`,
      {
        reply_markup: {
          keyboard: buttons,
          resize_keyboard: true,
        },
      }
    );
  }
}

//function for button "ukrainian and english"
const handleSelection = (bot, msg, match, userContext) => {
  const chatId = msg.chat.id;
  const currentKey = "translationOptions";
  setKey(currentKey, userContext);
  const selectedLanguage = match[1] === "Ukrainian" ? "uk" : "en";
  userContext[chatId] = userContext[chatId] || {};
  userContext[chatId].selectedLanguage = selectedLanguage;
  userContext[chatId].selectNameLanguage = match[1];
  clickLanguageSelection(bot, chatId, userContext);
};

//function for message language select
function handleAnotherLangSelect(bot, chatId, userContext) {
  const currentKey = "translationOptions";
  setKey(currentKey, userContext);
  const buttons = takeButtons(currentKey);
  if (userContext[chatId] && userContext[chatId].selectedLanguage) {
    userContext[chatId].translate = true;
    bot.sendMessage(
      chatId,
      `Ви обрали мову: ${userContext[chatId].selectNameLanguage}, Введіть текст для перекладу ✏️`,
      {
        reply_markup: {
          keyboard: buttons,
          resize_keyboard: true,
        },
      }
    );
  }
}

//function message language select
function clickLanguages(bot, chatId, code, userContext) {
  if (userContext[chatId]) {
    if (code) {
      userContext[chatId].selectedLanguage = code;
      const selectNameLanguage =
        userContext[chatId].availableLanguages[code].name;
      userContext[chatId].selectNameLanguage = selectNameLanguage;

      handleAnotherLangSelect(bot, chatId, userContext);
    } else {
      bot.sendMessage(
        chatId,
        "Список мов не завантажено. Будь ласка, спробуйте ще раз."
      );
    }
  }
}

//function for "Continue learning words 📚"
function clickContinueLearnWords(bot, chatId, userContext, words) {
  const currentKey = "learningWords";
  setKey(currentKey, userContext);
  const buttons = takeButtons(currentKey);
  bot.sendMessage(chatId, `Як перекладається слово "${words}?`, {
    reply_markup: {
      keyboard: buttons,
      resize_keyboard: true,
    },
  });
}

// function for get flag country
function getFlagEmoji(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

function getPaginatedLanguages(languages, page, pageSize) {
  const start = page * pageSize;
  return languages.slice(start, start + pageSize);
}

module.exports = {
  clickStart,
  clickBack,
  clickInterpreter,
  clickInfo,
  clickDefineLanguageText,
  clickLanguages,
  setKey,
  handleSelection,
  clickContinueLearnWords,
  getFlagEmoji,
  getPaginatedLanguages,
};
