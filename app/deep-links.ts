import { LinkingOptions } from '@react-navigation/native';

export const linking: LinkingOptions<any> = {
  prefixes: ['roamcast://', 'https://roamcast.app'],
  config: {
    screens: {
      '(tour)': {
        path: ':code',
        parse: {
          code: (code: string) => code,
        },
      },
      '(guide)': {
        path: 'tour/:tourId',
        parse: {
          tourId: (tourId: string) => tourId,
        },
      },
      '(auth)': {
        screens: {
          'reset-password': 'reset-password',
          'login': 'login',
          'signup': 'signup'
        }
      },
      'index': ''
    }
  }
}; 