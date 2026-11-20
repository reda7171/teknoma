export type EditorialBook = {
  id: string
  title: string
  author: string
  price: number
  tone: 'green' | 'burgundy' | 'gold' | 'ink'
  mark: string
}

export const featuredBooks: EditorialBook[] = [
  { id: 'demo-1', title: 'L’Étranger', author: 'Albert Camus', price: 89, tone: 'green', mark: 'L\nÉ' },
  { id: 'demo-2', title: 'موسم الهجرة إلى الشمال', author: 'الطيب صالح', price: 95, tone: 'burgundy', mark: 'م' },
  { id: 'demo-3', title: 'The Psychology of Money', author: 'Morgan Housel', price: 99, tone: 'gold', mark: 'P\nM' },
  { id: 'demo-4', title: 'Le Prophète', author: 'Khalil Gibran', price: 79, tone: 'ink', mark: 'LP' },
]
