/**
 * タイトル・科目名の整形ユーティリティ。
 * trimTitle / trimCourseName。
 */

const trimTitle = (title) => {
    // タイトルの先頭の"第01回 "等の部分を削除
    title = title.replace(/^(第[0-9０-９]+回\s*)+/, '')
    return title;
};

const trimCourseName = (courseName) => {
    // 科目名の先頭の"01 "等の部分を削除
    courseName = courseName.replace(/^[0-9]+\s*/, '');
    // 科目名の末尾の" 123456a"等の部分を削除
    courseName = courseName.replace(/\s[0-9]+[A-Za-z０-９ａ-ｚＡ-Ｚ]*$/, '');
    // 科目名最後の"（’１８）"等の部分を削除する
    courseName = courseName.replace(/（’[0-9０-９]+）/, '');
    return courseName;
}

// グローバル関数として公開
window.trimTitle = trimTitle;
window.trimCourseName = trimCourseName;
