export type RouteCollection = {
  slug: string;
  icon: string;
  zh: { title: string; summary: string; intro: string; notes: string[] };
  en: { title: string; summary: string; intro: string; notes: string[] };
  routes: string[];
};

export const ROUTE_COLLECTIONS: RouteCollection[] = [
  {
    slug: 'road-majors',
    icon: 'route',
    zh: {
      title: '大满贯与城市路跑',
      summary: '六场大满贯，加上亚洲与欧洲的经典城市赛道。',
      intro: '把城市马拉松放在一起读：赛道版本、起终点动线、报名门槛和天气窗口各自不同，但训练逻辑可以共用。这里不评“最好”，只把可核验的差异摆出来。',
      notes: [
        '先读赛道版本与起终点，再读报名门槛；同一城市不同年份可能改线。',
        '城市马拉松的天气窗口通常只有 3–4 小时，训练要按比赛日时段而不是早晨。',
        '大满贯名额与资格每年变化，报名前以官方页面为准。',
      ],
    },
    en: {
      title: 'Majors and city road races',
      summary: 'The six majors, plus classic city courses in Asia and Europe.',
      intro: 'Read city marathons together: course version, start and finish logistics, entry rules and weather window differ, while the training logic overlaps. This is not a ranking, only a map of verifiable differences.',
      notes: [
        'Read course version and start/finish first, then entry rules; a city can change course between editions.',
        'A city race gives you a three-to-four-hour weather window; train for the race clock, not dawn.',
        'Major entry rules change each year; check the official page before planning.',
      ],
    },
    routes: ['boston', 'new-york', 'berlin', 'chicago', 'tokyo', 'london', 'shanghai', 'beijing', 'paris-marathon', 'valencia-marathon', 'seoul-marathon'],
  },
  {
    slug: 'road-ultras',
    icon: 'road',
    zh: {
      title: '超长距离路跑',
      summary: '从 56 公里到 246 公里，公路上的另一种耐力。',
      intro: '公路超马不是“马拉松加长”。Comrades 的上下坡、Two Oceans 的双峰、Spartathlon 的 36 小时时限、Diagonale des Fous 的山路，把补给、配速与夜间执行拆成完全不同的问题。',
      notes: [
        '先看总时限与关门结构，再看距离；56 公里也可能比 100 公里更紧。',
        '公路超马的补给可以更规律，但夜间与温差仍是主要风险。',
        '不要把马拉松配速直接外推到 50 公里以上。',
      ],
    },
    en: {
      title: 'Road ultras',
      summary: 'From 56 km to 246 km, another kind of endurance on road.',
      intro: 'A road ultra is not a marathon with extra distance. Comrades and its climbs, Two Oceans and its two mountains, Spartathlon and its 36-hour limit, Diagonale des Fous and its mountain trail turn fuelling, pacing and night execution into different problems.',
      notes: [
        'Read the overall limit and cut-off structure before the distance; 56 km can be tighter than 100 km.',
        'Road-ultra fuelling can be more regular, but night and temperature swings remain the main risks.',
        'Do not extrapolate marathon pace beyond 50 km.',
      ],
    },
    routes: ['comrades-marathon', 'two-oceans-marathon', 'spartathlon', 'diagonale-des-fous'],
  },
  {
    slug: 'hundred-milers',
    icon: 'mountain',
    zh: {
      title: '百英里山地经典',
      summary: 'UTMB、Western States、Hard Rock 与 UTCT：四条百英里主线。',
      intro: '百英里的差别不在“多少公里”，而在爬升集中在哪里、夜段多长、补给能否 crew、关门有多紧。这四条主线各有自己的规则体系，页面把可核验的部分单独标出。',
      notes: [
        '先读爬升与下降的分布，不要只看总爬升。',
        '抽签、资格赛与强制装备是三道独立门槛，不能互相替代。',
        '夜段与 crew 准入决定比赛日结构，训练要按这两项排。',
      ],
    },
    en: {
      title: 'Hundred-mile mountain classics',
      summary: 'UTMB, Western States, Hard Rock and UTCT: four hundred-mile spines.',
      intro: 'The difference between hundreds is not the distance but where the climb sits, how long the night is, whether crew can reach you and how tight the cut-offs are. Each of these four has its own rule system; the pages separate what can be verified.',
      notes: [
        'Read the distribution of climb and descent, not only total gain.',
        'Lottery, qualifier and mandatory kit are three separate gates; one does not replace another.',
        'Night sections and crew access define race-day structure; train around those two.',
      ],
    },
    routes: ['utmb', 'western-states', 'hardrock', 'utct', 'leadville-trail-100', 'tds', 'ccc', 'occ'],
  },
  {
    slug: 'asia-trails',
    icon: 'map',
    zh: {
      title: '亚洲山径',
      summary: '宁海、香港、富士山、高黎贡与东南亚的技术与湿热。',
      intro: '亚洲越野的共同点不是同一条赛道，而是湿度、雨季、夜温与补给可达性。把 UTNH、HK100、Mt.FUJI、Gaoligong 放在一起，能看到“热”与“技术地形”如何分别改变比赛。',
      notes: [
        '湿热是核心变量：同一配速在 28°C 与 18°C 是两件事。',
        '香港与宁海的石阶、泥径需要单独练下坡与湿滑通过。',
        '东南亚赛事的雨季与检查站可达性要先查官方最新公告。',
      ],
    },
    en: {
      title: 'Asian trails',
      summary: 'Ninghai, Hong Kong, Fuji, Gaoligong and Southeast Asian heat.',
      intro: 'Asian trails do not share one course; they share humidity, monsoon timing, night temperature and how reachable the aid stations are. Read UTNH, HK100, Mt.FUJI and Gaoligong together to see how heat and technical terrain change a race in different ways.',
      notes: [
        'Humidity is the main variable: the same pace at 28°C and 18°C is two different efforts.',
        'Hong Kong and Ninghai stone steps and mud need dedicated descent and wet-grip practice.',
        'Check the latest official notice for monsoon timing and aid-station access in Southeast Asia.',
      ],
    },
    routes: ['utnh', 'hong-kong-100', 'mt-fuji-100', 'gaoligong-mgu', 'chiang-dao-160', 'doi-inthanon-pagoda-50-day', 'qmt-135', 'everest-marathon', 'elephant-100'],
  },
  {
    slug: 'alpine-technical',
    icon: 'compass',
    zh: {
      title: '阿尔卑斯与技术型',
      summary: '高海拔、碎石、岩面与短距离爆发。',
      intro: '从 Sierre-Zinal 的 31 公里到 Tor des Géants 的 330 公里，阿尔卑斯把“坡度”与“技术性”拆成两条轴。这里收录的是需要读剖面、读路面、读天气窗口的赛道。',
      notes: [
        '先看技术地形比例与最高点，再看距离。',
        '高山天气窗口短，装备与撤退方案要比公路赛更保守。',
        '短距离山地竞速与百英里是两种训练，不要用同一套周计划。',
      ],
    },
    en: {
      title: 'Alpine and technical',
      summary: 'Altitude, scree, rock and short-distance intensity.',
      intro: 'From Sierre-Zinal at 31 km to Tor des Géants at 330 km, the Alps split “steepness” and “technicality” into two axes. These are courses that require reading the profile, the surface and the weather window.',
      notes: [
        'Read technical-terrain share and high point before distance.',
        'Alpine weather windows are short; kit and escape plans should be more conservative than road races.',
        'Short mountain racing and hundred-mile racing are different training problems.',
      ],
    },
    routes: ['sierre-zinal', 'mont-blanc-marathon', 'lavaredo', 'val-daran', 'wildstrubel', 'tor-des-geants', 'vmm-100', 'transgrancanaria', 'zegama', 'dragons-back-race', 'sdw100'],
  },
  {
    slug: 'americas-africa-oceania',
    icon: 'globe',
    zh: {
      title: '美洲、非洲与大洋洲',
      summary: '峡谷、雨林、沙漠、草原与南半球赛季。',
      intro: '这一组跨四个大陆：美国峡谷的干热、巴西与智利的雨林、非洲草原的海拔、澳洲与新西兰的南半球赛季。把它们放在一起，是为了比较“环境”而不是“距离”。',
      notes: [
        '环境优先：干热、湿热、高海拔与南半球冬季不能共用一套补给。',
        '南半球赛季与北半球相反，7 月不是所有地方的夏天。',
        '跨国参赛的时差、疫苗与旅行保险要单独排进计划。',
      ],
    },
    en: {
      title: 'Americas, Africa and Oceania',
      summary: 'Canyons, rainforest, desert, savannah and the southern season.',
      intro: 'This group crosses four continents: dry heat in US canyons, rainforest in Brazil and Chile, altitude on African savannah, and the southern season in Australia and New Zealand. They sit together to compare environment, not distance.',
      notes: [
        'Environment first: dry heat, humid heat, altitude and southern winter do not share one fuelling plan.',
        'The southern season is inverted; July is not summer everywhere.',
        'Time zones, vaccinations and travel insurance need their own block in the plan.',
      ],
    },
    routes: ['bigs-backyard-ultra', 'black-canyon-ultras', 'canyons', 'gpt100-miler', 'kodiak', 'miut', 'paraty-brazil', 'patagonia-run', 'torrencial-chile', 'antarctic-ice-marathon', 'buenos-aires', 'cape-town', 'lewa-safari-marathon', 'tarawera', 'ultra-trail-australia', 'sydney', 'marathon-des-sables'],
  },
];

export function routeCollection(slug: string): RouteCollection | undefined {
  return ROUTE_COLLECTIONS.find((item) => item.slug === slug);
}
