const TelegramBot = require("node-telegram-bot-api");
const token = "6858306905:AAFHB8qvXZgrbmqmGezka8_hID64fwX3sBI";
const {
  handleTranslation,
  handleDefineLanguages,
  getListLanguages,
  getLanguages,
} = require("./translationRequest");

const {
  clickStart,
  clickBack,
  clickInterpreter,
  clickInfo,
  handleSelection,
  clickDefineLanguageText,
  clickLanguages,
  clickContinueLearnWords,
} = require("./buttonHandlers");
const {
  getWordFromDatabase,
  deleteWordFromDatabase,
  findWordInDatabase,
} = require("./databaseOperations");
const {
  initializeGame,
  showQuestion,
  generateLevelQuestions,
  checkLevelUp,
  getUserGameData,
  updateInlineKeyboardForQuestion,
  navigateQuestions,
  areAllQuestionsAnswered,
} = require("./game");

const bot = new TelegramBot(token, { polling: true });

const userContext = {
  currentKey: String,
};

bot.onText(/Test 📝/, (msg) => {
  const chatId = msg.chat.id;
  const gameData = initializeGame(chatId);
  generateLevelQuestions(gameData, chatId, bot);
});

bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const callbackData = callbackQuery.data;
  const gameData = getUserGameData(chatId);

  if (
    !gameData ||
    !gameData.questions ||
    gameData.currentQuestionIndex < 0 ||
    gameData.currentQuestionIndex >= gameData.questions.length
  ) {
    await bot.sendMessage(chatId, "Спочатку почніть гру командою /Game 🕹️");
    return;
  }
  if (
    gameData.questions &&
    gameData.currentQuestionIndex >= 0 &&
    gameData.currentQuestionIndex < gameData.questions.length
  ) {
    const currentQuestion = gameData.questions[gameData.currentQuestionIndex];

    if (callbackData.startsWith("answer_")) {
      if (!currentQuestion.answered) {
        const answerIndex = parseInt(callbackData.split("_")[1]);
        const isCorrect = currentQuestion.answers[answerIndex].isCorrect;

        currentQuestion.answered = true;
        currentQuestion.isCorrectAnswer = isCorrect;
        gameData.points += isCorrect ? 10 : 0;

        currentQuestion.answers.forEach((answer, idx) => {
          answer.answered = true;
          answer.isCorrectAnswer = idx === answerIndex ? isCorrect : !isCorrect;
        });

        updateInlineKeyboardForQuestion(
          currentQuestion,
          chatId,
          messageId,
          bot
        );
        if (areAllQuestionsAnswered(gameData.questions)) {
          checkLevelUp(gameData, bot, chatId, messageId);
        }
      }
    } else if (callbackData === "next" || callbackData === "prev") {
      navigateQuestions(gameData, callbackData);
      await showQuestion(chatId, bot, gameData);
    }
  }
});

//button and commands for ignoring
const buttonCommands = [
  "⬅️ Back",
  "/back",
  "/info",
  "/start",
  "/translate",
  "/define",
  "/languages",
  "Continue learning words 📚",
  "Delete words 🗑️",
];

//button and command "/info"
bot.onText(/\/info/, (msg) => clickInfo(bot, msg));
bot.onText(/Info/, (msg) => clickInfo(bot, msg));

//command "/start"
bot.onText(/\/start/, (msg) => clickStart(bot, msg, userContext));

//button and command "back"
bot.onText(/\/back/, (msg) => clickBack(bot, msg, userContext));
bot.onText(/Back/, (msg) => clickBack(bot, msg, userContext));

//button and command "/translate"
bot.onText(/\/translate/, (msg) => clickInterpreter(bot, msg, userContext));
bot.onText(/Interpreter/, (msg) => clickInterpreter(bot, msg, userContext));

//button "select languages"
bot.onText(/(Ukrainian|English)/, (msg, match) =>
  handleSelection(bot, msg, match, userContext)
);

//button "Select another language"
bot.onText(/Select another language/, (msg, match) => {
  const chatId = msg.chat.id;
  getListLanguages(bot, chatId, userContext);
});

//button "list languages"
bot.onText(/\/languages/, (msg) => {
  const chatId = msg.chat.id;
  getListLanguages(bot, chatId, userContext);
});

//button "define the language"
bot.onText(/Define the language/, (msg) =>
  clickDefineLanguageText(bot, msg, userContext)
);
bot.onText(/\/define/, (msg) => clickDefineLanguageText(bot, msg, userContext));

//button "language the text"
bot.onText(/Language the text 🔍/, (msg) => {
  const chatId = msg.chat.id;
  userContext[chatId] = {
    ...userContext[chatId],
    awaitingLanguageDetection: true,
  };
  if (userContext[chatId] && userContext[chatId].awaitingLanguageDetection) {
    getLanguages(bot, chatId, userContext);
  }
  bot.sendMessage(chatId, `Введіть текст!`);
});

//button function for learning words
bot.onText(/Continue learning words 📚/, async (msg) => {
  const chatId = msg.chat.id;

  if (!userContext[chatId]) {
    userContext[chatId] = {};
  }
  if (userContext[chatId] && userContext[chatId].selectedLanguage) {
    userContext[chatId].translate = false;

    const wordInfo = await getWordFromDatabase(
      chatId,
      userContext[chatId].selectNameLanguage,
      userContext
    );

    if (wordInfo) {
      userContext[chatId].currentQuestion = {
        word: wordInfo.words,
        correctAnswer: wordInfo.translation,
      };
      clickContinueLearnWords(bot, chatId, userContext, wordInfo.words);
    } else {
      bot.sendMessage(chatId, "Наразі немає слів для вивчення. 🤷‍♂️");
    }
  }
});

//button for delete words from database
bot.onText(/Delete word/, async (msg) => {
  const chatId = msg.chat.id;
  if (userContext[chatId] && userContext[chatId].currentQuestion) {
    const word = userContext[chatId].currentQuestion.word;
    const language = userContext[chatId].selectNameLanguage;

    const id = await findWordInDatabase(word, language);

    await deleteWordFromDatabase(id);
    bot.sendMessage(chatId, "Word deleted 🗑️");
  } else {
    await deleteWordFromDatabase(userContext.wordId);
    bot.sendMessage(chatId, "Word deleted 🗑️");
  }
});

bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const buttonData = callbackQuery.data;

  if (userContext[chatId] && userContext[chatId].awaitingLanguageChoice) {
    if (buttonData === "next_page" || buttonData === "prev_page") {
      userContext[chatId].currentPage = userContext[chatId].currentPage || 0;
      userContext[chatId].currentPage += buttonData === "next_page" ? 1 : -1;

      const { text, keyboard } = await getListLanguages(
        bot,
        chatId,
        userContext,
        true
      );

      bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: keyboard.reply_markup,
        parse_mode: "HTML",
      });
    } else {
      const code = buttonData.replace("lang_", "");

      clickLanguages(bot, chatId, code, userContext);
    }
  }
});

// message
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (buttonCommands.includes(text)) {
    return;
  }

  if (userContext[chatId] && userContext[chatId].translate) {
    const username = msg.chat.username;
    handleTranslation(bot, chatId, msg.text, userContext, username);
  }

  if (userContext[chatId] && userContext[chatId].awaitingLanguageDetection) {
    handleDefineLanguages(bot, chatId, msg.text, userContext);
  }

  if (userContext[chatId] && userContext[chatId].currentQuestion) {
    const userAnswer = msg.text;

    const { correctAnswer } = userContext[chatId].currentQuestion;
    const isCorrect =
      userAnswer.trim().toLowerCase() === correctAnswer.toLowerCase();

    const responseMessage = isCorrect
      ? "Вірно! ✅"
      : `❌ Неправильно ❌. Правильна відповідь: ${correctAnswer}`;

    bot.sendMessage(chatId, responseMessage);

    delete userContext[chatId].currentQuestion;
  }
});
