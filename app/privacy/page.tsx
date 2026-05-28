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
    title: '제1조 (수집하는 개인정보 항목)',
    bullets: [
      '텔레그램 사용자 ID: 자동 로그인 및 계정 식별에 사용',
      '텔레그램 닉네임: 서비스 내 표시명 및 리더보드 표시',
      '텔레그램 프로필 이미지: 서비스 내 프로필 표시 (선택)',
      '베팅 기록: 마켓 참여 내역, 포인트 지급/차감 기록',
      '서비스 이용 기록: 접속 일시, 마켓 열람 이력',
      '기기 정보: OS 종류, 앱 버전 (오류 분석 목적)',
      '회사는 민감정보(주민등록번호, 금융정보, 건강정보 등)는 수집하지 않습니다.',
    ],
  },
  {
    title: '제2조 (개인정보 수집 방법)',
    bullets: [
      '텔레그램 미니앱 자동 로그인 시 텔레그램 SDK를 통해 자동 수집',
      '서비스 이용 과정에서 이용자가 직접 생성하는 정보(베팅, 활동 기록)',
    ],
  },
  {
    title: '제3조 (개인정보 이용 목적)',
    bullets: [
      '회원 식별 및 서비스 이용 자격 확인',
      '포인트 지급, 차감, 정산 등 서비스 운영',
      '리더보드, 통계 등 서비스 기능 제공',
      '부정 이용 탐지 및 서비스 보안 유지',
      '서비스 개선 및 오류 분석',
      '공지사항 전달 및 고객 지원',
    ],
  },
  {
    title: '제4조 (개인정보 보관 기간)',
    bullets: [
      '계정 정보(텔레그램 ID 등): 서비스 탈퇴 후 30일 이내 파기',
      '베팅/포인트 기록: 서비스 탈퇴 후 90일 이내 파기',
      '부정이용 기록: 탐지 후 1년 보관 (재가입 방지 목적)',
      '법령 의무 보관 기록: 관련 법령에서 정한 기간',
    ],
  },
  {
    title: '제5조 (개인정보 제3자 제공)',
    paragraphs: [
      '회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 이용자가 사전에 동의한 경우 또는 법령의 규정에 의거하거나 수사기관의 적법한 요청이 있는 경우는 예외입니다.',
    ],
  },
  {
    title: '제6조 (개인정보 처리 위탁)',
    bullets: [
      'Supabase Inc.: 데이터베이스 저장 및 관리 (미국, AWS 기반 — 국외 이전)',
      'Vercel Inc.: 웹앱 호스팅 및 배포 (미국 — 국외 이전)',
    ],
  },
  {
    title: '제7조 (이용자의 권리)',
    bullets: [
      '개인정보 열람 요청',
      '오류가 있는 경우 정정 요청',
      '삭제 요청 (단, 법령상 보관 의무가 있는 정보는 즉시 삭제 불가)',
      '처리 정지 요청',
      '권리 행사는 contact@xplanet.co.kr 로 신청할 수 있습니다.',
    ],
  },
  {
    title: '제8조 (개인정보 보호책임자)',
    bullets: [
      '책임자: 엑스플래닛(주) 대표이사',
      '이메일: contact@xplanet.co.kr',
      '처리 기간: 접수 후 10영업일 이내 회신',
    ],
  },
  {
    title: '제9조 (쿠키 및 자동 수집 도구)',
    bullets: [
      '서비스는 텔레그램 미니앱 환경에서 운영되며, 별도의 쿠키를 사용하지 않습니다.',
      '웹앱 이용 시 서비스 품질 개선을 위해 최소한의 세션 정보가 수집될 수 있습니다.',
    ],
  },
  {
    title: '제10조 (개인정보처리방침 변경)',
    bullets: [
      '본 방침은 법령, 정부 지침 또는 서비스 변경에 따라 개정될 수 있습니다.',
      '개정 시 시행일 7일 전부터 서비스 내 공지하며, 중요한 변경은 30일 전 공지합니다.',
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

export default function PrivacyPage() {
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

        <h1 className="text-xl font-bold text-white mt-4 mb-6">개인정보처리방침</h1>

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
