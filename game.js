const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const key = "e8fd5f7c085f4fba97d6bae1ce427256";
const location = "westeurope";
const endpoint = "https://api.cognitive.microsofttranslator.com";

let userGameData = {
  playerId: {
    level: 1,
    points: 0,
    startTime: null,
    word1: null,
    word2: null,
    correctAnswer: null,
  },
};

//function for translate text
async function translateWord(text, chatId) {
  try {
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
        to: "uk",
      },
      data: [
        {
          text: text,
        },
      ],
      responseType: "json",
    });
    const translatedText = translationResponse.data[0].translations[0].text;
    return translatedText;
  } catch (error) {
    console.error("Error translating text:", error);
    bot.sendMessage(chatId, "Виникла помилка під час перекладу.");
    return null;
  }
}

async function getRandomWord() {
  try {
    const response = await axios.get(
      "https://wordsapiv1.p.rapidapi.com/words/",
      {
        headers: {
          "x-rapidapi-key":
            "293f3d9819msh0d027a0f7ef5788p133e32jsn1706f5f2cfec",
          "x-rapidapi-host": "wordsapiv1.p.rapidapi.com",
        },
        params: { random: true },
      }
    );
    return response.data.word;
  } catch (error) {
    console.error("Error fetching word from WordsAPI:", error);
    return null;
  }
}

function initializeGame(playerId, bot) {
  userGameData[playerId] = {
    level: 1,
    points: 0,
    currentQuestionIndex: 0,
    questions: [],
    startTime: new Date(),
    word1: null,
    word2: null,
    correctAnswer: null,
  };
  return userGameData[playerId];
}

async function generateLevelQuestions(gameData, chatId, bot) {
  gameData.questions = [];

  for (let i = 0; i < 5; i++) {
    const word = await getRandomWord();
    const translation = await translateWord(word, chatId);

    // Генерація фейкових відповідей
    let answers = [{ word, isCorrect: true }];
    for (let j = 0; j < gameData.level; j++) {
      const fakeWord = await getRandomWord();
      if (fakeWord !== word) {
        answers.push({ word: fakeWord, isCorrect: false });
      }
    }

    // Перемішування відповідей
    answers = shuffleArray(answers);

    gameData.questions.push({ translation, answers });
  }

  gameData.currentQuestionIndex = 0;
  await showQuestion(chatId, bot, gameData);
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function showQuestion(chatId, bot, gameData) {
  if (
    gameData.currentQuestionIndex >= 0 &&
    gameData.currentQuestionIndex < gameData.questions.length
  ) {
    const currentQuestion = gameData.questions[gameData.currentQuestionIndex];
    const questionText = `Рівень ${
      gameData.level
    }                                                                              🎯Point: ${
      gameData.points
    } 🧐\n Запитання ${
      gameData.currentQuestionIndex + 1
    }: Як перекладається слово '${currentQuestion.translation}'?`;

    const answerButtons = currentQuestion.answers.map((answer, index) => {
      let emoji = "";
      if (answer.answered) {
        emoji = answer.isCorrectAnswer ? " ✅" : " ❌";
      }
      return [{ text: answer.word + emoji, callback_data: "answer_" + index }];
    });

    const navigationButtons = [
      [
        { text: "⬅️", callback_data: "prev" },
        { text: "➡️", callback_data: "next" },
      ],
    ];

    const inlineKeyboard = {
      inline_keyboard: answerButtons.concat(navigationButtons),
    };

    if (gameData.questionMessageId) {
      await bot.editMessageText(questionText, {
        chat_id: chatId,
        message_id: gameData.questionMessageId,
        reply_markup: inlineKeyboard,
      });
    } else {
      const sentMessage = await bot.sendMessage(chatId, questionText, {
        reply_markup: inlineKeyboard,
      });
      gameData.questionMessageId = sentMessage.message_id;
    }
  } else if (
    gameData.currentQuestionIndex < 0 ||
    gameData.currentQuestionIndex >= gameData.questions.length
  ) {
    gameData.currentQuestionIndex = 0;
  }
}

function updateInlineKeyboardForQuestion(question, chatId, messageId, bot) {
  const updatedInlineKeyboard = {
    inline_keyboard: question.answers
      .map((answer, index) => {
        let emoji = "";
        if (answer.answered) {
          emoji = answer.isCorrect ? " ✅" : " ❌";
        }
        return [
          { text: answer.word + emoji, callback_data: "answer_" + index },
        ];
      })
      .concat([
        [
          { text: "⬅️", callback_data: "prev" },
          { text: "➡️", callback_data: "next" },
        ],
      ]),
  };

  bot.editMessageReplyMarkup(updatedInlineKeyboard, {
    chat_id: chatId,
    message_id: messageId,
  });
}

function navigateQuestions(gameData, direction) {
  if (direction === "next") {
    gameData.currentQuestionIndex =
      (gameData.currentQuestionIndex + 1) % gameData.questions.length;
  } else if (direction === "prev") {
    gameData.currentQuestionIndex =
      (gameData.currentQuestionIndex - 1 + gameData.questions.length) %
      gameData.questions.length;
  }
}

function areAllQuestionsAnswered(questions) {
  return questions.every((question) => question.answered);
}

function checkLevelUp(gameData, bot, chatId, messageId) {
  if (gameData.points >= 40) {
    gameData.level++;
    gameData.points = 0;

    if (gameData.level > 3) {
      bot.deleteMessage(chatId, messageId);
      bot.sendMessage(chatId, "🎉 Вітаємо! Ви успішно завершили тест. 👏");
    } else {
      generateLevelQuestions(gameData, chatId, bot);
    }
  } else {
    generateLevelQuestions(gameData, chatId, bot);
  }
}

function getUserGameData(chatId) {
  return userGameData[chatId];
}

module.exports = {
  initializeGame,
  showQuestion,
  generateLevelQuestions,
  getUserGameData,
  checkLevelUp,
  updateInlineKeyboardForQuestion,
  navigateQuestions,
  areAllQuestionsAnswered,
};
