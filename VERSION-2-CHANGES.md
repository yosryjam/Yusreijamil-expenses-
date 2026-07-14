# Version 2 – Phase 1 changes

## Completed

- Removed the Claude/Anthropic API integration.
- Removed the Netlify PDF-processing Function.
- Added local browser PDF extraction using `pdfjs-dist`.
- Added automatic document detection for MAX, CAL, AMEX, Mileage Plus and Bank Leumi.
- Added multiple-file upload.
- Added duplicate filtering.
- Added a review-and-edit table before transactions are saved.
- Added transaction confidence and source fields.
- Added full JSON backup and restore.
- Added CSV transaction export.
- Updated deployment instructions for a free static Netlify deployment.

## Important limitation

This release parses digital PDFs with selectable text. It does not yet OCR scanned image PDFs. Statement formats vary, so the review table must be used to verify transactions before saving.

## Recommended next phase

Build dedicated parsers using one sample PDF from each issuer, with all personal details and account numbers redacted except statement structure, transaction dates, merchant names and amounts.
