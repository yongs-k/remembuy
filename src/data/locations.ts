import type { Location, Category, MasterItem } from '../types'

function mi(id: string, name: string): MasterItem {
  return { id, name }
}

export const LOCATIONS: Location[] = [
  { id: 'bathroom', name: '욕실', colorToken: 'bathroom' },
  { id: 'kitchen', name: '주방', colorToken: 'kitchen' },
  { id: 'laundry', name: '세탁실/다용도실', colorToken: 'laundry' },
  { id: 'closet', name: '옷장/드레스룸', colorToken: 'closet' },
  { id: 'vanity', name: '화장대', colorToken: 'vanity' },
  { id: 'bedroom', name: '침실', colorToken: 'bedroom' },
  { id: 'livingroom', name: '거실', colorToken: 'livingroom' },
  { id: 'entrance', name: '현관/신발장', colorToken: 'entrance' },
  { id: 'medicine', name: '상비약함', colorToken: 'medicine' },
]

export const CATEGORIES: Category[] = [
  {
    id: 'bathroom-haircare',
    locationId: 'bathroom',
    name: '헤어케어',
    masterItems: [
      mi('bathroom-haircare-shampoo', '샴푸'),
      mi('bathroom-haircare-rinse', '린스'),
      mi('bathroom-haircare-treatment', '트리트먼트'),
      mi('bathroom-haircare-essence', '헤어에센스'),
      mi('bathroom-haircare-scaler', '두피스케일러'),
    ],
  },
  {
    id: 'bathroom-bodycare',
    locationId: 'bathroom',
    name: '바디케어',
    masterItems: [
      mi('bathroom-bodycare-wash', '바디워시'),
      mi('bathroom-bodycare-lotion', '바디로션'),
      mi('bathroom-bodycare-scrub', '각질제거제'),
      mi('bathroom-bodycare-handcream', '핸드크림'),
    ],
  },
  {
    id: 'bathroom-oralcare',
    locationId: 'bathroom',
    name: '구강케어',
    masterItems: [
      mi('bathroom-oralcare-toothpaste', '치약'),
      mi('bathroom-oralcare-toothbrush', '칫솔'),
      mi('bathroom-oralcare-floss', '치실'),
      mi('bathroom-oralcare-mouthwash', '가글'),
    ],
  },
  {
    id: 'bathroom-skincare',
    locationId: 'bathroom',
    name: '스킨케어',
    masterItems: [
      mi('bathroom-skincare-cleanser', '클렌징폼'),
      mi('bathroom-skincare-toner', '스킨/토너'),
      mi('bathroom-skincare-lotion', '로션'),
      mi('bathroom-skincare-essence', '에센스'),
      mi('bathroom-skincare-cream', '크림'),
      mi('bathroom-skincare-sunscreen', '선크림'),
    ],
  },
  {
    id: 'bathroom-hygiene',
    locationId: 'bathroom',
    name: '위생용품',
    masterItems: [
      mi('bathroom-hygiene-razor', '면도기'),
      mi('bathroom-hygiene-swab', '면봉'),
      mi('bathroom-hygiene-cottonpad', '화장솜'),
      mi('bathroom-hygiene-toiletpaper', '두루마리 휴지'),
      mi('bathroom-hygiene-wetwipe', '물티슈'),
    ],
  },
  {
    id: 'kitchen-grocery',
    locationId: 'kitchen',
    name: '식료품',
    masterItems: [
      mi('kitchen-grocery-coffee', '원두/커피'),
      mi('kitchen-grocery-teabag', '티백'),
      mi('kitchen-grocery-salt', '소금'),
      mi('kitchen-grocery-sugar', '설탕'),
      mi('kitchen-grocery-oil', '식용유'),
      mi('kitchen-grocery-soysauce', '간장'),
    ],
  },
  {
    id: 'kitchen-household',
    locationId: 'kitchen',
    name: '생활용품',
    masterItems: [
      mi('kitchen-household-detergent', '주방세제'),
      mi('kitchen-household-sponge', '수세미'),
      mi('kitchen-household-towel', '키친타올'),
      mi('kitchen-household-wrap', '랩'),
      mi('kitchen-household-foil', '호일'),
    ],
  },
  {
    id: 'kitchen-storage',
    locationId: 'kitchen',
    name: '보관용품',
    masterItems: [
      mi('kitchen-storage-ziplock', '지퍼백'),
      mi('kitchen-storage-container', '밀폐용기'),
      mi('kitchen-storage-trashbag', '종량제 봉투'),
    ],
  },
  {
    id: 'laundry-supplies',
    locationId: 'laundry',
    name: '세탁용품',
    masterItems: [
      mi('laundry-supplies-detergent', '세탁세제'),
      mi('laundry-supplies-softener', '섬유유연제'),
      mi('laundry-supplies-bleach', '표백제'),
      mi('laundry-supplies-net', '세탁망'),
    ],
  },
  {
    id: 'laundry-cleaning',
    locationId: 'laundry',
    name: '청소용품',
    masterItems: [
      mi('laundry-cleaning-allpurpose', '다목적세제'),
      mi('laundry-cleaning-moldremover', '곰팡이 제거제'),
      mi('laundry-cleaning-gloves', '고무장갑'),
    ],
  },
  {
    id: 'closet-clothing',
    locationId: 'closet',
    name: '상의·하의·아우터',
    masterItems: [
      mi('closet-clothing-tshirt', '티셔츠'),
      mi('closet-clothing-knit', '니트'),
      mi('closet-clothing-pants', '바지'),
      mi('closet-clothing-jacket', '재킷'),
    ],
  },
  {
    id: 'closet-care',
    locationId: 'closet',
    name: '의류관리용품',
    masterItems: [
      mi('closet-care-dehumidifier', '제습제'),
      mi('closet-care-freshener', '방향제'),
      mi('closet-care-mothball', '좀약'),
      mi('closet-care-lintremover', '보풀제거기'),
    ],
  },
  {
    id: 'vanity-makeup',
    locationId: 'vanity',
    name: '메이크업',
    masterItems: [
      mi('vanity-makeup-foundation', '파운데이션'),
      mi('vanity-makeup-lipstick', '립스틱'),
      mi('vanity-makeup-eyeshadow', '아이섀도우'),
      mi('vanity-makeup-blusher', '블러셔'),
    ],
  },
  {
    id: 'vanity-hairstyling',
    locationId: 'vanity',
    name: '헤어스타일링',
    masterItems: [
      mi('vanity-hairstyling-wax', '왁스'),
      mi('vanity-hairstyling-spray', '헤어스프레이'),
      mi('vanity-hairstyling-dryessence', '드라이 에센스'),
    ],
  },
  {
    id: 'vanity-fragrance',
    locationId: 'vanity',
    name: '향',
    masterItems: [
      mi('vanity-fragrance-perfume', '향수'),
      mi('vanity-fragrance-mist', '바디미스트'),
    ],
  },
  {
    id: 'bedroom-bedding',
    locationId: 'bedroom',
    name: '침구',
    masterItems: [
      mi('bedroom-bedding-cover', '이불커버'),
      mi('bedroom-bedding-pillowcase', '베개커버'),
      mi('bedroom-bedding-mattresspad', '매트리스 패드'),
    ],
  },
  {
    id: 'bedroom-air',
    locationId: 'bedroom',
    name: '공기관리',
    masterItems: [
      mi('bedroom-air-diffuser', '디퓨저'),
      mi('bedroom-air-humidifierfilter', '가습기 필터'),
      mi('bedroom-air-freshener', '방향제'),
    ],
  },
  {
    id: 'livingroom-cleaning',
    locationId: 'livingroom',
    name: '청소용품',
    masterItems: [
      mi('livingroom-cleaning-wetwipe', '물티슈'),
      mi('livingroom-cleaning-dustcloth', '먼지제거포'),
      mi('livingroom-cleaning-cleaningpad', '청소포'),
    ],
  },
  {
    id: 'livingroom-misc',
    locationId: 'livingroom',
    name: '소모 잡화',
    masterItems: [
      mi('livingroom-misc-battery', '리모컨 건전지'),
      mi('livingroom-misc-freshener', '방향제'),
      mi('livingroom-misc-candle', '초'),
    ],
  },
  {
    id: 'entrance-shoecare',
    locationId: 'entrance',
    name: '신발관리',
    masterItems: [
      mi('entrance-shoecare-deodorizer', '신발탈취제'),
      mi('entrance-shoecare-waterproof', '방수스프레이'),
      mi('entrance-shoecare-polish', '구두약'),
    ],
  },
  {
    id: 'entrance-outing',
    locationId: 'entrance',
    name: '외출용품',
    masterItems: [
      mi('entrance-outing-umbrella', '우산'),
      mi('entrance-outing-mask', '여분 마스크'),
    ],
  },
  {
    id: 'medicine-firstaid',
    locationId: 'medicine',
    name: '구급용품',
    masterItems: [
      mi('medicine-firstaid-antacid', '소화제'),
      mi('medicine-firstaid-coldmed', '감기약'),
      mi('medicine-firstaid-bandage', '밴드'),
      mi('medicine-firstaid-ointment', '연고'),
      mi('medicine-firstaid-thermometer', '체온계'),
    ],
  },
]

export function getCategoriesForLocation(locationId: string): Category[] {
  return CATEGORIES.filter((c) => c.locationId === locationId)
}
