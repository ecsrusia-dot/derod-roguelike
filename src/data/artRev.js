// 1.264.2~ 일러 교체 판 번호 — 서비스 워커가 일러를 CacheFirst로 1년 보관하므로
// 같은 파일 이름으로 덮어쓴 일러는 여기 번호를 올려야 기기에서 새 그림이 보인다 (주소가 바뀌어 새로 받음).
// ART_REV = 챔피언십 적 폴더 / CLASS_ART_REV = 직업 일러 (elf.jpg·elfstart·elfwin·elfloss·combat/elf_combat 5장 공통)
export const ART_REV = { sanctum: 2, dawn: 2 };
export const CLASS_ART_REV = { elf: 2 };

export function withArtRev(src) {
  if (!src || src.includes('?')) return src;
  let m = src.match(/\/championship\/([a-z]+)\//);
  let rev = m && ART_REV[m[1]];
  if (!rev) {
    m = src.match(/\/classes\/(?:combat\/)?([a-z]+?)(?:start|win|loss|_combat)?\.jpg$/);
    rev = m && CLASS_ART_REV[m[1]];
  }
  return rev ? `${src}?v=${rev}` : src;
}
