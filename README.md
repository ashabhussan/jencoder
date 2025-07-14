# Jencoder – JWT Encoder Tool

[![GitHub Stars](https://img.shields.io/github/stars/ashabhussan/jencoder?style=social)](https://github.com/ashabhussan/jencoder)
[![MIT License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

<!-- Add more badges as needed -->

Jencoder (JWT+Encoder) is a lightweight, browser-based utility that lets you generate, sign, and inspect JSON Web Tokens (JWTs) in seconds. It’s designed for **developers** who need a quick way to create, prototype, and debug tokens during development and testing – no backend or CLI required.

## ✨ Features

- 🔑 **Algorithm Support** – HS256, RS256, ES256, and more
- 🧹 **Fix & Prettify JSON** button – One-click fix & format for malformed JSON payloads, preventing parse errors during testing
- 💾 **Import / Export Config** – Export your full token configuration with header, payload, key and re-import it in any browser or device
- 👀 **Live Token Preview** – Instantly view the encoded JWT as you type
- 🏷️ **Claim Toggles** – Quickly add / remove common claims:
  - `exp` (Expiration Time)
  - `iat` (Issued At)

## 🚀 Getting Started

1. **Clone & run locally**

   ```bash
   git clone https://github.com/ashabhussan/jencoder
   cd jencoder
   npm install
   npm run dev  # starts Vite dev server
   ```

   Then open `http://localhost:8080` in your browser.

2. **Or just open the web build**

   No install needed – grab the latest release or visit the hosted demo in your browser.

## 🤝 Contributing

We welcome all contributions! Before you start, please read our [Contributing Guidelines](CONTRIBUTING.md) which includes:

- 🛠 Development setup instructions
- 📝 Commit message guidelines
- 🔍 Code style guide
- 🐛 How to report issues
- 🔄 Pull request process

For small changes, feel free to open a pull request directly. For larger changes, please open an issue first to discuss the proposed changes.

## 📝 License

Distributed under the MIT License.

```
MIT License

Copyright (c) 2025 Jencoder Contributors
```

For full license terms and conditions, please see the [LICENSE](LICENSE) file.
