import type { Package } from '../types'

// Статические моки для отрисовки доски без бэкенда.
// Имена полей в camelCase — как в src/types.ts.

export const mockPackages: Package[] = [
  {
    id: 1,
    title: 'Неотсортированное',
    order: 0,
    isUnsorted: true,
    questions: [
      {
        id: 101,
        packageId: 1,
        order: 0,
        text: 'По преданию, этот город основали близнецы, выкормленные волчицей. Назовите город.',
        answer: 'Рим',
        comment: 'Ромул и Рем.',
        rejectedAnswer: null,
        handout: null,
        alternativeAnswers: [{ id: 1, questionId: 101, text: 'Рим-вечный город' }],
        sources: [
          { id: 1, questionId: 101, text: 'Ливий, "История Рима от основания города"' },
        ],
        testers: [
          { id: 1, name: 'Анна Петрова' },
          { id: 2, name: 'Игорь Смирнов' },
        ],
      },
      {
        id: 102,
        packageId: 1,
        order: 1,
        text: 'Этот химический элемент назван в честь планеты. Какой?',
        answer: 'Уран',
        comment: null,
        rejectedAnswer: null,
        handout: null,
        alternativeAnswers: [],
        sources: [{ id: 2, questionId: 102, text: 'Википедия — Уран (элемент) https://ru.wikipedia.org' }],
        testers: [{ id: 3, name: 'Мария Ковалёва' }],
      },
    ],
  },
  {
    id: 2,
    title: 'Пакет 1 (синхрон)',
    order: 1,
    isUnsorted: false,
    questions: [
      {
        id: 201,
        packageId: 2,
        order: 0,
        text: 'В этом произведении герой трижды дерётся, и в финале его убивают. Назовите героя.',
        answer: 'Гектор',
        comment: 'Поединок с Ахиллом.',
        rejectedAnswer: null,
        handout: null,
        alternativeAnswers: [{ id: 2, questionId: 201, text: 'Гектор троянский' }],
        sources: [{ id: 3, questionId: 201, text: 'Гомер, "Илиада"' }],
        testers: [{ id: 1, name: 'Анна Петрова' }],
      },
      {
        id: 202,
        packageId: 2,
        order: 1,
        text: 'Как называется развёрнутая метафора, распространённая на несколько строк?',
        answer: 'Аллегория',
        comment: null,
        rejectedAnswer: null,
        handout: null,
        alternativeAnswers: [],
        sources: [{ id: 4, questionId: 202, text: 'Литературная энциклопедия' }],
        testers: [
          { id: 2, name: 'Игорь Смирнов' },
          { id: 3, name: 'Мария Ковалёва' },
        ],
      },
    ],
  },
  {
    id: 3,
    title: 'Пакет 2 (брейн-ринг)',
    order: 2,
    isUnsorted: false,
    questions: [
      {
        id: 301,
        packageId: 3,
        order: 0,
        text: 'Назовите столицу Австралии.',
        answer: 'Канберра',
        comment: 'Не Сидней и не Мельбурн.',
        rejectedAnswer: null,
        handout: null,
        alternativeAnswers: [],
        sources: [{ id: 5, questionId: 301, text: 'Атлас мира' }],
        testers: [{ id: 1, name: 'Анна Петрова' }],
      },
    ],
  },
]
