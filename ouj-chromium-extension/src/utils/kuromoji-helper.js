// kuromoji-helper.js

window.tokenizer = null;

/**
 * kuromoji.jsのTokenizerをシングルトンとして取得する
 * @returns {Promise<object>} Tokenizerインスタンス
 */
async function getTokenizer() {
  if (window.tokenizer) {
    return window.tokenizer;
  }

  return new Promise((resolve, reject) => {
    if (typeof kuromoji === 'undefined') {
      // kuromoji.jsがロードされていない場合はエラー
      return reject(new Error('kuromoji.js is not loaded.'));
    }
    // return;
    // 拡張機能内の辞書ファイルへのパスを解決する
    // スラッシュから始めることが肝要っぽい
    // https://qiita.com/ara1yu81/items/d803d1c0623777788182
    const dicPath = '/libraries/kuromoji/dict';
    const chromeDicPath = chrome.runtime.getURL(dicPath);
    kuromoji.builder({ dicPath: chromeDicPath }).build((err, builtTokenizer) => { // こっちが正しそう
      if (err) {
        return reject(err);
      }
      resolve(builtTokenizer);
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