# Privacy Policy for Snap: Prompting Helper

**Last Updated: February 1, 2026**

## Overview

Snap is a Chrome extension that helps you improve your AI prompts by analyzing your writing patterns and providing real-time feedback. This privacy policy explains what data we collect, how we use it, and your rights.

## Data Collection

### What We Collect

1. **Typing Velocity Data**
   - We monitor your typing speed and pause patterns to detect when you've finished writing a prompt
   - This data is processed locally in your browser and is NOT stored or transmitted anywhere

2. **Prompt Text**
   - When you trigger an assessment (automatically via velocity detection or manually), the text you've written is sent to Google's Gemini API for analysis
   - We only send the specific text being assessed, not your entire browsing history or other page content

3. **User Preferences**
   - Your API key for Gemini
   - Extension settings and preferences
   - This data is stored locally in your browser using Chrome's storage API

### What We DON'T Collect

- We do NOT collect or store your personal information (name, email, etc.)
- We do NOT track your browsing history
- We do NOT store your prompts on any server
- We do NOT share your data with third parties except as described below

## How We Use Your Data

1. **Typing Velocity Analysis**: Processed locally to determine optimal timing for prompt assessment
2. **Prompt Assessment**: Your prompt text is sent to Google's Gemini API to generate feedback and suggestions
3. **Settings Storage**: Your preferences are saved locally to personalize your experience

## Third-Party Services

### Google Gemini API

When you use Snap, your prompt text is sent to Google's Generative Language API (Gemini) for analysis. This is essential for the extension to function.

- **What's sent**: The prompt text you're assessing
- **Google's privacy policy**: https://policies.google.com/privacy
- **Your API key**: You provide your own Gemini API key, which is stored locally in your browser

We are not responsible for Google's data handling practices. Please review their privacy policy independently.

## Data Storage

All data is stored **locally in your browser** using Chrome's storage API:
- API keys
- User preferences
- Extension settings

**We do NOT have any backend servers.** Your data never leaves your device except when sent directly to Google's Gemini API for prompt analysis.

## Permissions Justification

Snap requires the following permissions:

1. **Access to all websites (`<all_urls>`)**
   - **Why**: To detect typing patterns and assess prompts on any website where you interact with AI (ChatGPT, Claude, Gemini, etc.)
   - **What we do**: Monitor typing velocity and read text from input fields only when you're actively using the extension
   - **What we DON'T do**: Track browsing, read passwords, or access data unrelated to prompt writing

2. **Storage permission**
   - **Why**: To save your API key and preferences locally in your browser
   - **What we do**: Store settings so you don't have to reconfigure the extension every time you use it

## Your Rights

- **Access**: Your data is stored locally - you can view it in Chrome's extension storage
- **Deletion**: Uninstalling the extension deletes all locally stored data
- **Control**: You can disable the extension at any time to stop data processing

## Children's Privacy

Snap is not directed at children under 13. We do not knowingly collect data from children.

## Changes to This Policy

We may update this privacy policy as the extension evolves. Changes will be posted in the Chrome Web Store listing and updated in this document with a new "Last Updated" date.

## Contact

For questions or concerns about this privacy policy, contact:

**Email**: lianxunwang2025@gmail.com

## Consent

By using Snap, you consent to this privacy policy and our data practices as described above.
