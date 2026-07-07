// 放送大学へのログイン処理。
//
// このサイトのログインセッションはセッションCookie（ブラウザプロセスを終了すると
// 失われる種類）のようで、ブラウザを閉じて再起動すると同じuserDataDirを使っても
// セッションが引き継がれない。そのため「別プロセスで事前にログインしておく」方式
// ではなく、テスト実行中ずっと同じブラウザプロセス（context）を使い回い、その中で
// 一度だけログインする方式を取る（tests/visual/fixtures.js 参照）。
const { expect } = require('@playwright/test');

async function ensureLoggedIn(context) {
  const username = process.env.OUJ_TEST_USERNAME;
  const password = process.env.OUJ_TEST_PASSWORD;
  if (!username || !password) {
    throw new Error(
      '.env に OUJ_TEST_USERNAME / OUJ_TEST_PASSWORD を設定してください（.env.example を参照）。'
    );
  }

  const page = await context.newPage();
  try {
    await page.goto('https://v.ouj.ac.jp/view/ouj/#/navi/home');

    // このサイトは未ログインでもホーム画面自体は閲覧できる（自動リダイレクトは
    // されない）。ヘッダーの「ログイン」ボタンを押すとSSOログイン画面に遷移する。
    // Angular/Ionicの描画が終わるまでボタンはDOMに現れないため、isVisible()の
    // ような即時判定ではなく waitFor（ポーリング）で待つ必要がある。
    // 既にログイン済みの場合はこのボタン自体がDOMに存在しない（*ngIfで除去される）。
    const loginButton = page.locator('common-header button.login-button');
    const loggedInIndicator = page.locator('.user-id-menu ion-label.user-id');

    const loginButtonAppeared = await loginButton
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true)
      .catch(() => false);

    if (loginButtonAppeared) {
      await loginButton.click();
      await page.waitForURL(/sso\.ouj\.ac\.jp\/cas\/login/, {
        timeout: 15000,
      });
      await page.fill('#username', username);
      await page.fill('#password', password);

      // 拡張機能自体（src/page-login.js）に、パスワードが8文字より長く入力
      // されたら自動でログインボタンを押す機能がある。ここで自分でも
      // click()すると、拡張機能の自動クリックと競合し、ボタンが無効化/DOM
      // から消えるタイミングとPlaywrightのアクション可能性チェックがぶつかって
      // 無駄なリトライでタイムアウトすることがある。そのため、まずは拡張機能の
      // 自動クリックによる遷移を待ち、起きなければ自分でクリックする
      // （forceで見た目上の状態チェックを飛ばす）。
      try {
        await page.waitForURL(/v\.ouj\.ac\.jp\/view\/ouj\/#\/navi\/home/, {
          timeout: 8000,
        });
      } catch {
        await page.click('button[name="submitBtn"][type="submit"]', {
          force: true,
          noWaitAfter: true,
        });
        await page.waitForURL(/v\.ouj\.ac\.jp\/view\/ouj\/#\/navi\/home/, {
          timeout: 30000,
        });
      }
    }

    // ログインに成功していれば、ゲスト表示には存在しない自分のユーザーIDが表示される。
    await expect(loggedInIndicator).toBeVisible({ timeout: 15000 });
  } finally {
    await page.close();
  }
}

module.exports = { ensureLoggedIn };
