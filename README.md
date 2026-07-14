# YJ Finance – Free Local PDF Edition

A private personal expense dashboard for monthly MAX, CAL, American Express, Mileage Plus and Bank Leumi PDF statements.

## Privacy and cost

- PDF extraction runs in the browser with `pdfjs-dist`.
- No Claude, OpenAI or paid API is required.
- PDFs are not uploaded to a third-party AI service.
- Transactions, budgets and rules are stored in browser `localStorage`.
- Use **Settings → Download full backup** regularly.

## Run locally

```bash
npm install
npm run dev
```

## Deploy to Netlify

1. Push this project to GitHub.
2. Connect the repository to Netlify.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. No API keys or environment variables are needed.

## PDF limitations

The free parser works with digital PDFs containing selectable text. Scanned image PDFs require OCR, which is not included in this first release. Always review imported transactions before saving because card issuers can change statement layouts.
