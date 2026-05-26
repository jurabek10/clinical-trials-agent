export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
  defaults: {
    maxStudies: 500,
    includeCitations: true,
  },
  examplePrompts: [
    'How are trials for Pembrolizumab distributed across phases?',
    'How has the number of trials for Pembrolizumab changed per year since 2015?',
    'What are the most common intervention types for Pembrolizumab trials?',
    'Compare phase distribution for Pembrolizumab vs Nivolumab.',
    'Compare sponsor categories across cancer and diabetes trials.',
    "Which countries have the most recruiting trials for Alzheimer's disease?",
    'Show a network of sponsors and drugs for melanoma trials since 2020.',
  ],
} as const;
