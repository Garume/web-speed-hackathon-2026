## 自前 Fly.io へのデプロイ

運営提供の review app ではなく、自分の Fly.io アカウントへデプロイしたいときの手順です。

このリポジトリには `Dockerfile` があるため、Fly.io はそのままソースからデプロイできます。

### なぜ設定ファイルを分けるのか

- 運営提供の Fly.io 環境で使う `fly.toml` は触らない方が安全です。
- 自前の Fly.io 用には `fly.self.toml` を使い、公式導線と混ぜないようにします。

### 推奨設定

- `primary_region = "nrt"`
  - このリポジトリの公式 Fly.io 設定と合わせます。
- `auto_stop_machines = "off"`
  - マシンを常時起動にして、採点時のコールドスタートを避けます。
- 1 台固定
  - このアプリはメモリ上の session とインスタンスローカルなファイルを使うため、2 台より 1 台の方が安全です。

### 初回セットアップ

1. `flyctl` を入れる
   - Windows (PowerShell):

     ```powershell
     pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
     ```

2. ログインする

   ```powershell
   fly auth login
   ```

3. 設定テンプレートをコピーする

   ```powershell
   Copy-Item fly.self.toml.example fly.self.toml
   ```

4. `fly.self.toml` を編集する
   - `app = "your-app-name"` をグローバルで一意な名前に変更します。

### 初回デプロイ

1. Fly.io 上に app を作る

   ```powershell
   fly apps create <your-app-name>
   ```

2. 1 台構成でデプロイする

   ```powershell
   fly deploy -c fly.self.toml --ha=false
   ```

3. 念のため台数を 1 台に固定する

   ```powershell
   fly scale count 1 -a <your-app-name>
   ```

4. アプリを開く

   ```powershell
   fly apps open -a <your-app-name>
   ```

公開 URL は次の形式になります。

```text
https://<your-app-name>.fly.dev/
```

### 再デプロイ

```powershell
fly deploy -c fly.self.toml
```

もし 0 台まで落としてから再度立ち上げるなら、初回と同様に `--ha=false` を付けた方が 2 台化を避けやすいです。

### トラブルシュート

- ログを見る:

  ```powershell
  fly logs -a <your-app-name>
  ```

- マシン台数を見る:

  ```powershell
  fly machine list -a <your-app-name>
  ```

- 2 台できていたら 1 台に戻す:

  ```powershell
  fly scale count 1 -a <your-app-name>
  ```

### 採点時の注意

- 採点中は再デプロイしないでください。
- 競技終了後のレギュレーションチェックが終わるまでアクセス可能な状態を保ってください。
- 登録 URL には `https://<your-app-name>.fly.dev/` を使ってください。
