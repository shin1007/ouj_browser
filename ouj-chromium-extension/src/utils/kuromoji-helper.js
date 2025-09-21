// kuromoji-helper.js

let tokenizer = null;

/**
 * kuromoji.jsのTokenizerをシングルトンとして取得する
 * @returns {Promise<object>} Tokenizerインスタンス
 */
async function getTokenizer() {
  if (tokenizer) {
    return tokenizer;
  }

  return new Promise((resolve, reject) => {
    if (typeof kuromoji === 'undefined') {
      // kuromoji.jsがロードされていない場合はエラー
      return reject(new Error('kuromoji.js is not loaded.'));
    }

    kuromoji.builder({ dicPath: '/public/dict/' }).build((err, builtTokenizer) => {
      if (err) {
        return reject(err);
      }
      tokenizer = builtTokenizer;
      resolve(tokenizer);
    });
  });
}

/**
 * テキストを形態素解析し、名詞のみを抽出する
 * @param {string} text 解析するテキスト
 * @returns {Promise<string[]>} 名詞の配列
 */
async function extractNouns(text) {
  if (!text) return [];
  try {
    const tokenizerInstance = await getTokenizer();
    const tokens = tokenizerInstance.tokenize(text);
    return tokens
      .filter(token => token.pos === '名詞')
      .map(token => token.surface_form);
  } catch (error) {
    console.error('Error during tokenization:', error);
    return [];
  }
}

window.getTokenizer = getTokenizer;
window.extractNouns = extractNouns;