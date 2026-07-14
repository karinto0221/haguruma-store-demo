import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProductOrderControlsProps } from '../type';

export default function ProductOrderControls({
  quantity,
  onQuantityChange,
  onOrder,
}: ProductOrderControlsProps) {
  const parsedQuantity = Number(quantity);
  const isQuantityValid = Number.isInteger(parsedQuantity) && parsedQuantity >= 1;

  return (
    <div className="detail-order-box">
      <div className="field detail-quantity">
        <Label htmlFor="detailQuantity">数量</Label>
        <Input
          id="detailQuantity"
          type="number"
          min={1}
          step={1}
          required
          value={quantity}
          onChange={(e) => onQuantityChange(e.target.value)}
        />
      </div>
      <Button
        type="button"
        className="detail-order-button"
        disabled={!isQuantityValid}
        onClick={onOrder}
      >
        注文情報の入力へ
      </Button>
    </div>
  );
}
