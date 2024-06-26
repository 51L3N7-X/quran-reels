module.exports = {
  extends: ["airbnb-base", "plugin:prettier/recommended", "airbnb"],
  parserOptions: {
    ecmaVersion: "latest",
  },
  rules: {
    "max-len": ["error", { comments: 120, code: 100 }],

    "no-console": ["off"],
    "no-plusplus": ["off"],
    "operator-linebreak": ["off"],
    curly: ["off"],
    "nonblock-statement-body-position": ["off"],
    "no-await-in-loop": ["off"],
    "no-param-reassign": ["off"],
    "implicit-arrow-linebreak": ["off"],
    "import/extensions": ["off"],
    "object-curly-newline": ["off"],
    "no-restricted-syntax": ["off"],
    "no-use-before-define": ["off"],
    "function-paren-newline": "off",
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
