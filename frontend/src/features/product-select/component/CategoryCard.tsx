import type { CategoryCardProps } from "../type";

export default function CategoryCard({
  category,
  onSelect,
}: CategoryCardProps) {
  return (
    <button className="catalog-card" onClick={() => onSelect(category.id)}>
      <div className="catalog-image-wrap">
        {category.imageUrl ? (
          <img src={category.imageUrl} alt="" className="catalog-image" />
        ) : (
          <div className="catalog-image-placeholder">PAPER</div>
        )}
      </div>
      <div className="catalog-card-body">
        <div className="catalog-card-title">{category.name}</div>
        <span className="catalog-card-link">商品を見る →</span>
      </div>
    </button>
  );
}
