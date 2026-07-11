# Claude Code Configuration

Always use specific read-only tools (`view_file`, `list_dir`, `grep`, `glob`, `get_codebase_context`, `codebase_search`, `find_by_name`, `view_outline`, `web_fetch`, `http_request` ) instead of running commands like `cat`, `ls`, `grep` via the `bash` tool.

コメントはすべて日本語で行ってください。

## 気づいたことはTODOとして残す

作業中に気づいたが今回は変更を加えなかった点は、必ずTODOコメントとして残してください。

- 対象のコード付近に `// TODO: ...`（日本語で内容を記述）を挿入する。
- 変更しなかった理由と、将来どうすべきかが分かるように書く。
- 黙って見送らず、気づいた改善点・不具合の可能性は都度TODOとして明示する。