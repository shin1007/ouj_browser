# 放送大学の放送授業（テレビ・ラジオ）のオンライン視聴をしやすくするためのChrome拡張機能。
・ESMは利用できない（拡張機能なので）
・単体テストはうまくできない（経験不足のため）

## 実装をあきらめていること
・動画の自動再生（ブラウザのポリシーの問題で音声付き動画を自動で再生できない）
・音声のみ再生（動作は軽くなるかもしれないが、読み込みサイズは変化なさそう）
・OPEDの曲の検知（DRMの問題でうまく取れない。）

## categoryIDの取得方法
放送大学のログインページでF12
ネットワークタブを開く
ログインボタンをクリックして、ログインリクエストを確認
リクエストヘッダーの中にあるcategoriesの値を取得
それを使って、ログイン後のページでカテゴリIDを取得する
リクエスト
https://v.ouj.ac.jp/v1/tenants/1/categories

## 動画ページのcontentIDの取得方法
https://v.ouj.ac.jp/v1/tenants/1/vod-contents?qt=4&categoryId=30211&offset=0&limit=30&sortType=1&sortOrder=asc

## 動画をどこまで見たか？
https://v.ouj.ac.jp/v1/tenants/1/vod-contents/31761/viewinglog/latest

## ページとURL
ログイン前
https://v.ouj.ac.jp/view/ouj/#/navi/vod?ca=30374 (表示されない)
ログインページ
https://sso.ouj.ac.jp/cas/login?service=https%3A%2F%2Fv.ouj.ac.jp%2Fv1%2Ftenants%2F1%2Flogin%2Fcas%3FredirectUrl%3Dhttps%253A%252F%252Fv.ouj.ac.jp%252Fview%252Fouj%252F%2523%252Fnavi%252Fvod%26ca%3D30374
以下でもOK
https://sso.ouj.ac.jp/cas/login
教養学部
https://v.ouj.ac.jp/view/ouj/#/navi/vod?ca=2
心理と教育コース
https://v.ouj.ac.jp/view/ouj/#/navi/vod?ca=10
進化心理学
https://v.ouj.ac.jp/view/ouj/#/navi/vod?ca=30374
第1回講義
https://v.ouj.ac.jp/view/ouj/#/navi/player?co=33648&ct=V&ca=30374

## カテゴリID（カテゴリ）
### ログイン後
parent category
2: 01 教養学部
3: 02 大学院
4: 03 夏季集中科目
5: 04 ラジオ番組の字幕付加実験
6: 05 特別講義
7: 01 基盤科目
8: 02 基盤科目(外国語科目)
9: 03 生活と福祉コース
10: 04 心理と教育コース
11: 05 社会と産業コース
12: 06 人間と文化コース
13: 07 情報コース
14: 08 自然と環境コース
16: 01 生活健康科学プログラム
17: 02 人間発達科学プログラム
18: 03 臨床心理学プログラム
19: 04 社会経営科学プログラム
20: 05 人文学プログラム
21: 06 情報学プログラム
22: 07 自然環境科学プログラム
23: 01 司書教諭資格取得に資する科目
25: 01 教養学部
28: 01 テレビ

1239: 看護師資格取得に関する科目

content
104: 006 発達心理学概論（’１７） 1720023
139: 050 乳幼児・児童の心理臨床（’１７） 1529218
225: 025 舞台芸術の魅力（’１７） 1554891
291: 018 生物の進化と多様化の科学（’１７） 1562851a
307: 033 線型代数学（’１７） 1562827
392: 003 計算論（’１６） 8960631
878: 014 初歩からの数学（’１８） 1160028
900: 015 総合人類学としてのヒト学（’１８） 1740083


### ログイン前
parent category
29: 02 ラジオ
489: 01 テレビ
490: 02 ラジオ
491: 01 OCW（全15回公開）
492: 02 授業科目等一覧（1回分のみ公開）
493: 01 OCW（全15回公開）
494: 02 授業科目一覧（1回分のみ公開）

content
812: 089 生物の進化と多様化の科学（’１７） 1562851p
817: 068 舞台芸術の魅力（’１７） 1554891p
832: 037 乳幼児・児童の心理臨床（’１７） 1529218p

<div class="vjs-current-time vjs-time-control vjs-control">
    <div class="vjs-current-time-display" aria-live="off">
        <span class="vjs-control-text">現在時間</span>
            00:24
    </div>
</div>

<div class="vjs-duration vjs-time-control vjs-control">
    <div class="vjs-duration-display" aria-live="off">
        <span class="vjs-control-text">再生時間</span>
            45:00
    </div>
</div>