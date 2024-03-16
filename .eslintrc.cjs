module.exports = {
  extends: ["airbnb-base", "plugin:prettier/recommended", "airbnb"],
  parserOptions: {
    ecmaVersion: "latest",
  },
  rules: {
    "max-len": ["error", { comments: 120 }],

    "no-console": ["off"],
    "no-plusplus": ["off"],
    "operator-linebreak": ["off"],
    curly: ["off"],
    "nonblock-statement-body-position": ["off"],
    "no-await-in-loop": ["off"],
    "no-param-reassign": ["off"],
    "implicit-arrow-linebreak": ["off"],
    "import/extensions": ["off"],

    "prettier/prettier": [
      "error",
      {
        doubleQuote: true,
        endOfLine: "auto",
      },
    ],
    "linebreak-style": 0,
    quotes: "off",
  },
};
