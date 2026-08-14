import { classifyDifficulty } from './difficulty';
import type { SentenceItem } from './sentenceLoader';

// Dynamic Sentence Generator Templates per Topic
const BUSINESS_TEMPLATES = [
  { k: '우리 팀은 새로운 프로젝트 {act} 성공적으로 {verb}.', e: 'Our team successfully {everb} the new project {eact}.' },
  { k: '저희 회사는 글로벌 시장 {act} {verb}.', e: 'Our company is {everb} the global market {eact}.' },
  { k: '경영진은 이번 분기 {act} {verb}.', e: 'Management has {everb} this quarter\'s {eact}.' },
  { k: '해외 파트너사와 {act} {verb}.', e: 'We {everb} the {eact} with our overseas partner.' },
  { k: '내일 아침 회의에서 {act} {verb}.', e: 'In tomorrow morning\'s meeting, we will {everb} the {eact}.' },
];

const BUSINESS_ACTS = [
  { k: '전략안을', e: 'strategy plan', verb: '검토 중입니다', everb: 'reviewing' },
  { k: '예산안을', e: 'budget proposal', verb: '승인했습니다', everb: 'approved' },
  { k: '계약서를', e: 'contract terms', verb: '체결했습니다', everb: 'signed' },
  { k: '마케팅 캠페인을', e: 'marketing campaign', verb: '기획하고 있습니다', everb: 'planning' },
  { k: '업무 프로세스를', e: 'work process', verb: '개선했습니다', everb: 'improved' },
  { k: '신제품 발표회를', e: 'new product launch', verb: '준비 중입니다', everb: 'preparing' },
];

const TRAVEL_TEMPLATES = [
  { k: '공항 탑승 수속을 위해 {act} {verb}.', e: 'For airport check-in, we {everb} the {eact}.' },
  { k: '유명 관광지 부근에서 {act} {verb}.', e: 'Near the famous tourist spot, I {everb} the {eact}.' },
  { k: '숙소 직원의 도움으로 {act} {verb}.', e: 'With the hotel staff\'s help, we {everb} the {eact}.' },
  { k: '현지 전통 시장에서 {act} {verb}.', e: 'At the local traditional market, I {everb} the {eact}.' },
];

const TRAVEL_ACTS = [
  { k: '택시 승강장을', e: 'taxi stand', verb: '찾았습니다', everb: 'found' },
  { k: '짐 보관 서비스를', e: 'luggage storage service', verb: '이용했습니다', everb: 'used' },
  { k: '환승 지하철 노선을', e: 'transfer subway line', verb: '확인했습니다', everb: 'checked' },
  { k: '멋진 기념 사진을', e: 'souvenir photo', verb: '찍었습니다', everb: 'took' },
  { k: '인기 있는 맛집 지도를', e: 'popular restaurant map', verb: '받았습니다', everb: 'received' },
];

const DAILY_TEMPLATES = [
  { k: '오늘 아침에 따뜻한 커피를 마시며 {act} {verb}.', e: 'Drinking warm coffee this morning, I {everb} {eact}.' },
  { k: '퇴근 후 가까운 공원에서 {act} {verb}.', e: 'After work at a nearby park, I {everb} {eact}.' },
  { k: '주말마다 스트레스 해소를 위해 {act} {verb}.', e: 'Every weekend to relieve stress, I {everb} {eact}.' },
  { k: '여유로운 저녁 시간에 {act} {verb}.', e: 'During relaxed evening hours, I {everb} {eact}.' },
];

const DAILY_ACTS = [
  { k: '가벼운 산책을', e: 'a light walk', verb: '즐겼습니다', everb: 'enjoyed' },
  { k: '새로운 요리 레시피를', e: 'a new cooking recipe', verb: '배웠습니다', everb: 'learned' },
  { k: '좋아하는 음악 목록을', e: 'my favorite music playlist', verb: '들었습니다', everb: 'listened to' },
  { k: '재미있는 소설책을', e: 'an interesting novel', verb: '읽었습니다', everb: 'read' },
  { k: '방 안 정리를', e: 'room organization', verb: '마쳤습니다', everb: 'completed' },
];

const SCHOOL_TEMPLATES = [
  { k: '도서관 연구실에서 {act} {verb}.', e: 'In the library research lab, I {everb} {eact}.' },
  { k: '이번 학기 전공 수업에서 {act} {verb}.', e: 'In this semester\'s major class, we {everb} {eact}.' },
  { k: '동아리 친구들과 힘을 모아 {act} {verb}.', e: 'Together with club friends, we {everb} {eact}.' },
];

const SCHOOL_ACTS = [
  { k: '기말고사 시험 공부를', e: 'for final exams', verb: '준비했습니다', everb: 'prepared' },
  { k: '조별 발표 자료를', e: 'team presentation slides', verb: '제출했습니다', everb: 'submitted' },
  { k: '학술 논문 자료를', e: 'academic paper sources', verb: '정리했습니다', everb: 'organized' },
];

let dynamicCounter = 9000;

export function generateDynamicSentences(
  count: number,
  targetLevels: number[],
  targetTopics: string[]
): SentenceItem[] {
  const generated: SentenceItem[] = [];
  const levelSet = new Set(targetLevels.length > 0 ? targetLevels : [1, 2, 3, 4, 5]);
  const activeTopics = targetTopics.includes('all') ? ['business', 'travel', 'daily', 'school'] : targetTopics;

  let attempts = 0;
  while (generated.length < count && attempts < 200) {
    attempts++;
    const topic = activeTopics[Math.floor(Math.random() * activeTopics.length)];
    
    let tmplList = DAILY_TEMPLATES;
    let actList = DAILY_ACTS;

    if (topic === 'business') {
      tmplList = BUSINESS_TEMPLATES;
      actList = BUSINESS_ACTS;
    } else if (topic === 'travel') {
      tmplList = TRAVEL_TEMPLATES;
      actList = TRAVEL_ACTS;
    } else if (topic === 'school') {
      tmplList = SCHOOL_TEMPLATES;
      actList = SCHOOL_ACTS;
    }

    const tmpl = tmplList[Math.floor(Math.random() * tmplList.length)];
    const act = actList[Math.floor(Math.random() * actList.length)];

    const korean = tmpl.k.replace('{act}', act.k).replace('{verb}', act.verb);
    const english = tmpl.e.replace('{eact}', act.e).replace('{everb}', act.everb);

    const diff = classifyDifficulty(english);
    if (levelSet.has(diff.level) || attempts > 150) {
      dynamicCounter++;
      generated.push({
        id: dynamicCounter,
        korean,
        english,
        topic,
      });
    }
  }

  return generated;
}
