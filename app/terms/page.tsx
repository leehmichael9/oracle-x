'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';

type Section = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

const SECTIONS: Section[] = [
  {
    title: '제1조 (목적)',
    paragraphs: [
      "본 약관은 엑스플래닛(주)(이하 '회사')가 운영하는 Oracle-X 예측마켓 서비스(이하 '서비스')의 이용과 관련하여 회사와 이용자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.",
    ],
  },
  {
    title: '제2조 (정의)',
    bullets: [
      "'서비스'란 Oracle-X 텔레그램 미니앱 및 웹앱을 통해 제공되는 예측마켓 플랫폼 일체를 의미합니다.",
      "'이용자'란 본 약관에 동의하고 서비스를 이용하는 자를 의미합니다.",
      "'포인트'란 서비스 내에서만 사용 가능한 가상의 수치로, 현금 또는 그에 준하는 금전적 가치가 없으며 환급이 불가능한 소프트 커런시입니다.",
      "'마켓'이란 특정 이슈에 대한 예측 참여가 가능한 서비스 내 개별 이벤트를 의미합니다.",
      "'베팅'이란 이용자가 특정 마켓의 결과에 대해 포인트를 사용하여 의사를 표명하는 행위를 의미합니다.",
    ],
  },
  {
    title: '제3조 (약관의 효력 및 변경)',
    bullets: [
      '본 약관은 서비스 화면에 게시하거나 기타 방법으로 이용자에게 공지함으로써 효력이 발생합니다.',
      '회사는 필요한 경우 약관을 변경할 수 있으며, 변경 시 적용일자 7일 전부터 서비스 내 공지합니다.',
      '이용자가 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.',
      '변경된 약관의 공지 이후에도 계속하여 서비스를 이용하는 경우 변경 약관에 동의한 것으로 간주합니다.',
    ],
  },
  {
    title: '제4조 (서비스 이용 자격)',
    bullets: [
      '서비스는 만 18세 이상의 성인만 이용할 수 있습니다.',
      '텔레그램 계정을 보유한 자로서 본 약관에 동의한 경우 서비스 이용 자격이 부여됩니다.',
      '다음 각 호에 해당하는 자는 서비스 이용이 제한될 수 있습니다: 타인의 명의 또는 허위 정보를 사용하는 자, 다중 계정을 생성하거나 시도하는 자, 서비스의 정상적인 운영을 방해하는 자.',
    ],
  },
  {
    title: '제5조 (포인트 정책)',
    bullets: [
      '포인트는 현금이 아니며, 환금성이 없습니다.',
      '포인트는 서비스 내에서의 베팅 참여, 이벤트 참여 등 서비스 이용 목적으로만 사용할 수 있습니다.',
      '포인트는 이용자 간 임의 양도, 거래, 매매가 불가능합니다.',
      '포인트는 서비스 외부에서 어떠한 금전적 가치도 가지지 않습니다.',
      '신규 가입 보너스: 가입 시 1,000포인트 지급',
      '일일 출석 체크: 매일 50포인트 지급',
      '첫 베팅 보너스: 일 1회 100포인트 추가 지급',
      '마켓 공유: 텔레그램 공유 시 일 1회 200포인트 지급',
      '레퍼럴 (초대자): 피초대자 첫 베팅 완료 시 500포인트 지급',
      '레퍼럴 (피초대자): 초대 링크 가입 시 1,500포인트 지급',
      '베팅 정산: 적중 시 포인트 지급 (5% 플랫폼 수수료 차감)',
      '포인트는 회사의 정책에 따라 일정 기간 미사용 시 소멸될 수 있습니다.',
      '서비스 탈퇴 시 보유 포인트는 즉시 소멸되며 복구되지 않습니다.',
    ],
  },
  {
    title: '제6조 (마켓 운영 및 결과 정산)',
    bullets: [
      '마켓의 생성, 수정, 종료 및 결과 입력은 회사가 단독으로 결정합니다.',
      '마켓 결과는 공신력 있는 공개 정보(공식 발표, 주요 언론 보도 등)를 기준으로 회사가 최종 결정합니다.',
      '마켓 결과에 대한 이의는 결과 발표 후 48시간 이내에 고객센터를 통해 제기할 수 있습니다.',
      '천재지변, 이슈 취소, 정보 불충분 등으로 마켓 결과 확정이 불가능한 경우, 회사는 해당 마켓을 취소하고 베팅 포인트를 전액 반환할 수 있습니다.',
    ],
  },
  {
    title: '제7조 (금지 행위)',
    bullets: [
      '다중 계정 생성 및 운영',
      '자동화 도구(봇, 매크로 등)를 이용한 비정상적 포인트 획득',
      '타인의 계정 접근 또는 정보 도용',
      '서비스 시스템 해킹, 크래킹, 취약점 악용 시도',
      '허위 정보를 통한 레퍼럴 포인트 편취',
      '마켓 결과에 영향을 미치기 위한 정보 조작 또는 허위 유포',
      '회사, 임직원, 타 이용자에 대한 명예훼손, 비방, 위협 행위',
    ],
  },
  {
    title: '제8조 (서비스 이용 제한 및 제재)',
    bullets: [
      '회사는 제7조에 해당하는 행위 발견 시 사전 통지 없이 서비스 이용을 제한하거나 계정을 정지·삭제할 수 있습니다.',
      '제재 조치와 함께 해당 이용자의 포인트는 즉시 몰수됩니다.',
    ],
  },
  {
    title: '제9조 (서비스 변경 및 중단)',
    bullets: [
      '회사는 서비스의 내용, 정책, 운영 방식을 사전 공지 후 변경할 수 있습니다.',
      '불가피한 사유(시스템 점검, 천재지변, 보안 이슈 등)로 서비스를 일시 중단할 수 있습니다.',
      '서비스를 종료하는 경우 최소 30일 전 서비스 내 공지합니다.',
    ],
  },
  {
    title: '제10조 (면책 사항)',
    bullets: [
      '포인트는 현금 가치가 없으므로, 서비스 장애, 오류, 중단 등으로 인한 포인트 손실에 대해 회사는 금전적 배상 의무를 지지 않습니다.',
      '이용자가 서비스를 통해 기대하는 포인트 수익에 대해 회사는 보장하지 않습니다.',
      '서비스 내 정보는 예측 참여 목적으로 제공되며, 투자 조언이나 금융 정보로 해석될 수 없습니다.',
    ],
  },
  {
    title: '제11조 (개인정보 보호)',
    paragraphs: [
      '회사는 이용자의 개인정보를 별도의 개인정보처리방침에 따라 수집, 이용, 보관합니다.',
    ],
  },
  {
    title: '제12조 (준거법 및 관할)',
    bullets: [
      '본 약관은 대한민국 법률에 따라 해석되고 적용됩니다.',
      '서비스 이용과 관련한 분쟁 발생 시 회사의 본사 소재지를 관할하는 법원을 제1심 관할 법원으로 합니다.',
    ],
  },
];

function LegalSectionBlock({ section }: { section: Section }) {
  return (
    <section className="space-y-2">
      <h2 className="text-emerald-400 font-semibold text-sm">{section.title}</h2>
      {section.paragraphs?.map((text) => (
        <p key={text} className="text-slate-300 text-sm leading-relaxed">
          {text}
        </p>
      ))}
      {section.bullets && (
        <ul className="list-disc list-inside space-y-1.5 text-slate-300 text-sm leading-relaxed">
          {section.bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function TermsPage() {
  const router = useRouter();
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const topPadding = Math.max(headerHeight, 88);

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <div
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 w-full flex justify-center bg-[#0a0f1e] px-4 py-2"
      >
        <AppHeader />
      </div>

      <div
        className="w-full max-w-xl mx-auto px-4 pb-12"
        style={{ paddingTop: topPadding }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← 뒤로
        </button>

        <h1 className="text-xl font-bold text-white mt-4 mb-6">이용약관</h1>

        <div className="space-y-6">
          {SECTIONS.map((section) => (
            <LegalSectionBlock key={section.title} section={section} />
          ))}
        </div>

        <footer className="mt-10 pt-6 border-t border-white/10 text-slate-400 text-sm space-y-1">
          <p>시행일: 2026년 6월 8일</p>
          <p>엑스플래닛(주) | Oracle-X 사업부</p>
        </footer>
      </div>
    </div>
  );
}
