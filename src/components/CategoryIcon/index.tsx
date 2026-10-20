import {
  BookOpenText,
  CircleDollarSign,
  CircleStar,
  Database,
  type LucideIcon,
} from 'lucide-react';

/** Nomes de ícone que a API pode devolver em `icone`. */
const icons: Record<string, LucideIcon> = {
  database: Database,
  dollar: CircleDollarSign,
  book: BookOpenText,
  star: CircleStar,
};

type Props = {
  name: string;
};

/** Um nome que não esteja na lista cai no ícone de livro, em vez de quebrar a tela. */
export default function CategoryIcon({ name }: Props) {
  const Icon = icons[name] ?? BookOpenText;
  return <Icon aria-hidden="true" />;
}
