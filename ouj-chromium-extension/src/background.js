// background.js

// 注入するスクリプトの設定
const SCRIPT_TO_INJECT = {
    files: ["content.js"],
    // content.js がESMの場合、ここで type: 'module' を明示的に指定できます。
    // manifest.json で content_scripts に type: 'module' を設定している場合は不要です。
    // type: 'module'
};

chrome.webNavigation.onCompleted.addListener(function(details) {
    // 複数のURLパターンをチェック
    const isSsoPage = details.url.includes("https://sso.ouj.ac.jp");
    const isOujVideoPage = details.url.includes("https://v.ouj.ac.jp/view/ouj/#/navi/");

    if (isSsoPage || isOujVideoPage) {
        // 条件に合致した場合にのみスクリプトを実行
        chrome.scripting.executeScript({
            target: {tabId: details.tabId},
            ...SCRIPT_TO_INJECT // 上で定義したスクリプト設定を展開
        });
    }
}, {
    // onCompletedリスナーのフィルタを適切に設定
    // これにより、リスナーが発火するURLを事前に絞り込み、無駄なチェックを減らせます。
    url: [
        {hostContains: "sso.ouj.ac.jp"},
        {hostContains: "v.ouj.ac.jp"}
    ]
});