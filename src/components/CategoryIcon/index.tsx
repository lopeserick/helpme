import {
  BookOpenText,
  CircleDollarSign,
  CircleStar,
  Database,
  type LucideIcon,
} from 'lucide-react';
import type { CategoryIconName } from '../../data/helpCenter';

const icons: Record<CategoryIconName, LucideIcon> = {
  database: Database,
  dollar: CircleDollarSign,
  book: BookOpenText,
  star: CircleStar,
};

type Props = {
  name: CategoryIconName;
};

export default function CategoryIcon({ name }: Props) {
  const Icon = icons[name];
  return <Icon aria-hidden="true" />;
}
