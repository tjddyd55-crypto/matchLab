/** 상품 카테고리 표시 라벨 (client/server 공용) */
export function gymProductCategoryLabel(category: string): string {
  switch (category) {
    case "equipment":
      return "장비";
    case "apparel":
      return "의류";
    case "protective_gear":
      return "보호장비";
    case "goods":
      return "용품";
    case "other":
      return "기타";
    default:
      return category;
  }
}
