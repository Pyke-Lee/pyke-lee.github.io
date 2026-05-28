---
layout: project
title: Dungreed 모작 (WinAPI)
subtitle: C++과 WinAPI만으로 구현한 2D 로그라이크 액션 게임
youtube_id: 0cO1UhW1g5g
period: 2024.04 ~ 2024.05 (약 1개월)
team: 1인 개발
role: 전체 (설계, 구현, 타일 에디터, 사운드)
tech: [C++, WinAPI, GDI, FMOD]
github: https://github.com/Pyke-Lee/Jusin-Project/tree/main/3%EA%B0%9C%EC%9B%94/3%EA%B0%9C%EC%9B%94%EC%B0%A8%20API%20%EC%8B%9C%EC%97%B0%ED%9A%8C%20%EB%8D%98%EA%B7%B8%EB%A6%AC%EB%93%9C%20%EB%AA%A8%EC%9E%91
---

## 프로젝트 개요

자주 즐기던 로그라이크 액션 게임 Dungreed를 WinAPI로 모작한 개인 프로젝트입니다.
엔진이나 외부 그래픽 라이브러리 없이 **C++과 WinAPI(GDI)만으로** 게임의 핵심 시스템을 구현하는 것을 목표로 했습니다.

## 아키텍처

싱글톤 매니저 패턴을 기반으로 각 시스템을 독립된 매니저 클래스로 분리했습니다.

- **ObjMgr** — 오브젝트 생성·소멸·렌더 순서 관리
- **SceneMgr / StageMgr** — 씬 전환(Logo → Menu → Game)과 스테이지 전환(Town → Dungeon F0~F4 → Boss) 분리
- **CollisionMgr / LineMgr** — RECT 기반 충돌과 라인 기반 지형 충돌을 별도로 처리
- **TileMgr** — 타일맵 로드·렌더·컬링, 자체 타일 에디터(Edit 씬) 지원
- **BmpMgr** — 비트맵 리소스 로드 및 더블 버퍼링 렌더
- **SoundMgr** — FMOD 기반 BGM·효과음 관리
- **ScrollMgr** — 카메라 스크롤 및 뷰포트 좌표 변환
- **UIMgr / TextMgr** — HUD, 데미지 텍스트 팝업

오브젝트 생성에는 Abstract Factory 패턴을 사용하고, 게임 루프는 `GetTickCount64` 기반 10ms 고정 타임스텝으로 동작합니다.

모든 게임 오브젝트는 `CObj`를 상속받으며, `CAbstractFactory<T>::Create()`를 통해 타입별 인스턴스를 생성합니다.
템플릿으로 구현하여 새로운 오브젝트 타입이 추가되더라도 팩토리 코드를 수정할 필요 없이 `CObj`를 상속받기만 하면 동일한 생성 흐름(`new` → `Initialize()`)을 보장합니다.

<details class="code-block">
<summary>AbstractFactory.h <span class="file-badge">템플릿 팩토리</span></summary>
<pre markdown="0"><code class="language-cpp">#pragma once
#include "Obj.h"

template<typename T>
class CAbstractFactory {
public:
    CAbstractFactory() {}
    ~CAbstractFactory() {}

public:
    static CObj* Create() {
        CObj* pObj = new T;
        pObj->Initialize();

		return pObj;
	}
};</code></pre>
</details>

## 주요 구현 내용

### 플레이어 시스템

이동, 점프, 대시(3회 충전 + 시간 기반 회복), 허기(Food) 시스템을 구현했습니다.
능력치는 분노(공격력)·인내(방어력)·신비·탐욕·집중 5종으로 구성되며, 마우스 위치 기준으로 캐릭터 좌우 반전과 무기 조준이 동작합니다.

플레이어 클래스는 `CEntity`를 상속받아 HP·데미지 처리를 공유하면서, 대시 충전·능력치·인벤토리 등 플레이어 고유 시스템을 멤버로 관리합니다.
`Take_Damage`는 `final override`로 선언하여 하위 클래스에서의 재정의를 방지하고, 능력치 계산은 기본 스탯에 강화 수치를 곱한 값을 더하는 방식입니다.

<details class="code-block">
<summary>Player.h <span class="file-badge">플레이어 클래스 구조</span></summary>
<pre markdown="0"><code class="language-cpp">#pragma once
#include "Entity.h"

#define DEFAULT_PLAYER_HP				100
#define DEFAULT_PLAYER_FOOD				100
#define DEFAULT_PLAYER_DASH_COUNT		3
#define DEFAULT_PLAYER_MOVE_SPEED		6.f
#define DEFAULT_PLAYER_PICKUP_RADIUS	150.f

#define DASH_REGEN_TIME					1500

#define ABILITY_WRATH					2
#define ABILITY_PATIENCE				1
#define ABILITY_MYSTIC					1
#define ABILITY_GREED					2
#define ABILITY_FOCUS					2
#define ABILITY_MAX						20

class CPlayer : public CEntity {
public:
    enum STATE { IDLE, WALK, RUN, JUMP, DEAD, END };
    enum ABILITY { WRATH, PATIENCE, MYSTIC, GREED, FOCUS, ABILITY_END };

public:
    CPlayer() {}
    virtual ~CPlayer() { Release(); }

public:
    virtual void	Initialize()				override;
    virtual int		Update()					override;
    virtual void	Late_Update()				override;
    virtual void	Render(HDC hDC)				override;
    virtual void	Release()					override;
    virtual bool	Take_Damage(int _iDmg)	final override;

public:
    bool		Get_Down() { return m_bDown; }
    bool		Get_Dash() { return m_bDash; }
    bool		Get_GodMode() { return m_bGodMode; }
    bool		Get_Visible() { return m_bVisible; }
    int			Get_Money() { return m_iMoney; }
    int			Get_MaxFood() { return m_iMaxFood; }
    int			Get_CurFood() { return m_iCurFood; }
    int			Get_MaxDash() { return m_iMaxDash; }
    int			Get_CurDash() { return m_iDashCount; }
    RECT&		Get_HitRect() { return m_tHitRect; }

public:
    bool		Get_StatusOpen() { return m_bStatus; }
    int			Get_Pow() { return (m_iPow + (m_iWrath * ABILITY_WRATH)); }
    int			Get_Defence() { return (m_iDefence + (m_iPatience * ABILITY_PATIENCE)); }
    int			Get_Tough() { return m_iTough; }
    int			Get_Critical() { return (m_iCritical + (m_iMystic * ABILITY_MYSTIC)); }
    int			Get_CriticalDmg() { return (m_iCriticalDmg + (m_iFocus * ABILITY_FOCUS)); }
    int			Get_Dodge() { return (m_iDodge + (m_iMystic * ABILITY_MYSTIC)); }
    float		Get_AttackSpeed();

public:
    int			Get_Level() { return m_iLevel; }
    int			Get_Wrath() { return m_iWrath; }
    int			Get_Patience() { return m_iPatience; }
    int			Get_Mystic() { return m_iMystic; }
    int			Get_Greed() { return m_iGreed; }
    int			Get_Focus() { return m_iFocus; }
    int			Get_AbilityPoint() { return m_iPoint; }

public:
    void		Set_Ability(ABILITY eAbility, int iValue);
    void		Reset_Ability();

public:
    void		Set_StatusOpen() { m_bStatus = !m_bStatus; }
    void		Set_Pow(int _iValue) { m_iPow += _iValue; }
    void		Set_Defence(int _iValue) { m_iDefence += _iValue; }
    void		Set_Tough(int _iValue) { m_iTough += _iValue; }
    void		Set_Critical(int _iValue) { m_iCritical += _iValue; }
    void		Set_CriticalDmg(int _iValue) { m_iCriticalDmg += _iValue; }
    void		Set_Dodge(int _iValue) { m_iDodge += _iValue; }

public:
    void		Set_Down() { m_bDown = false; }
    void		Set_Money(int _iMoney) { m_iMoney += _iMoney; }
    void		Set_MainHand(CObj* pItem) { Safe_Delete(m_pMainHand); m_pMainHand = pItem; }
    void		Set_SubHand(CObj* pItem) { Safe_Delete(m_pSubHand); m_pSubHand = pItem; }
    void		Set_Visible(bool bCheck) { m_bVisible = bCheck; }
    void		Set_KeyLock(bool bCheck) { m_bKeyLock = bCheck; }
    void		Set_HitRect(long lLeft, long lTop, long lRight, long lBottom) { m_tHitRect = { lLeft, lTop, lRight, lBottom }; }
    void		Set_CurFood(int iFood);

public:
    void		Land();
    void		Calc_Damage();
    void		Reset();

private:
    void		Get_Key();
    void		Jumping();
    void		Dash();
    void		Chasing_Mouse();
    void		Motion_Change();
    void		Fixed_Pos();
    void		Find_Item_Radius();
    void		Attack();
    void		Update_HandPos();

private:
    bool		m_bJump = false;
    bool		m_bDown = false;
    bool		m_bDash = false;
    bool		m_bCharge = false;
    bool		m_bDoubleJump = false;
    bool		m_bAttack = false;
    bool		m_bVisible = true;
    bool		m_bKeyLock = false;
    bool		m_bAttackCheck = false;

	float		m_fFindRadius = DEFAULT_PLAYER_PICKUP_RADIUS;
	float		m_fDashAngle = 0.f;

	int			m_iMaxDash = 3;
	int			m_iDashCount = 3;
	int			m_iMoney = 0;
	int			m_iMaxFood = 0;
	int			m_iCurFood = 0;
	int			m_iMaxDoubleJump = 1;
	int			m_iDoubleJump = 1;
	int			m_iSwing = 0;

	STATE		m_ePrevState = END;
	STATE		m_eCurState = IDLE;

	POINTF		m_ptRightHand = { 0, 0 };
	POINTF		m_ptLeftHand = { 0, 0 };

	DWORD		m_dwPrev = (DWORD)GetTickCount64();
	DWORD		m_dwDash = (DWORD)GetTickCount64();
	DWORD		m_dwTime = (DWORD)GetTickCount64();
	DWORD		m_dwDelay = (DWORD)GetTickCount64();
	DWORD		m_dwDown = (DWORD)GetTickCount64();
	DWORD		m_dwGod = 0;
	DWORD		m_dwSwing = 0;

	CObj*		m_pMainHand = nullptr;
	CObj*		m_pSubHand = nullptr;

	RECT		m_tHitRect { 0, 0, 0, 0 };

	BLENDFUNCTION m_tBf = { AC_SRC_OVER, 0, 255, AC_SRC_ALPHA };

	bool		m_bStatus = false;
	int			m_iPow = 0;
	int			m_iDefence = 0;
	int			m_iTough = 0;
	int			m_iCritical = 0;
	int			m_iCriticalDmg = 50;
	int			m_iDodge = 0;

	int			m_iLevel = 30;
	int			m_iWrath = 0;
	int			m_iPatience = 0;
	int			m_iMystic = 0;
	int			m_iGreed = 0;
	int			m_iFocus = 0;
	int			m_iPoint = 0;
};</code></pre>
</details>

### 전투 및 무기

무기는 한손검(Gladius), 양손검(GreatSword), 방패(RoundShield), 총기(Colt) 4종으로 분류됩니다.
각 타입별 공격 패턴과 딜레이가 다르며, `PlgBlt` 기반 회전 렌더링으로 마우스 방향에 따라 무기가 회전합니다.
투사체는 무기·몬스터별로 독립된 Bullet 클래스로 구현했습니다.

모든 무기는 `CWeapon`을 상속받으며, `TYPE` 열거형으로 한손(ONE)·양손(TWO)·총기(GUN)를 구분합니다.
`Rotate()` 함수에서 `PlgBlt`에 필요한 세 꼭짓점 좌표(`POINT[3]`)를 삼각함수로 계산하고, 각 무기의 `Render`에서 이 좌표를 사용하여 회전된 이미지를 출력합니다.

<details class="code-block">
<summary>Weapon.h <span class="file-badge">무기 기반 클래스</span></summary>
<pre markdown="0"><code class="language-cpp">#pragma once
#include "Item.h"

class CWeapon : public CItem {
public:
    enum TYPE { ONE, TWO, GUN, END };

public:
    CWeapon() {}
    virtual ~CWeapon() {};

public:
    virtual void	Initialize()		PURE;
    virtual int		Update()			PURE;
    virtual void	Late_Update()		PURE;
    virtual void	Render(HDC hDC)		PURE;
    virtual void	Release()			PURE;
    virtual void	PickUp()			PURE;

public:
    void			Rotate();

	bool			Get_Equip() { return m_bEquip; }
	void			Set_Equip(bool bCheck) { m_bEquip = bCheck; }
	DWORD			Get_DelayTime() { return m_dwDelayTime; }
	TYPE			Get_WeaponType() { return m_eWeaponType; }
	int				Get_Price() { return m_iPrice; }
	TCHAR*			Get_Name() { return m_pName; }
	void			Set_Price(int iPrice) { m_iPrice = iPrice; }
	bool			Get_Sell() { return m_bSell; }
	void			Set_Sell(bool bCheck) { m_bSell = bCheck; }

protected:
    POINT			m_tPoint[3] { {0,0}, {0,0}, {0,0} };
    bool			m_bEquip = false;
    TYPE			m_eWeaponType = END;
    int				m_iPrice = 0;
    DWORD			m_dwDelayTime = 0;
    bool			m_bSell = true;
    bool			m_bInv = false;
    TCHAR			m_pName[256] = L"";
};</code></pre>
</details>

### 몬스터 및 보스

일반 몬스터 4종(Banshee, RedGiantBat, Minotaur, GiantSkeleton)은 각각 원거리/근거리 공격 패턴을 가지며, 자체 중력·낙하 시스템과 타일 충돌 기반 착지 판정으로 동작합니다.

보스 Belial은 다관절 구조(Hand 분리), 검 소환(Belial_Sword), 4방향 나선 탄막(Belial_Bullet) 등 복합 패턴으로 구현했습니다.

소환된 검은 플레이어를 향해 각도를 추적하다가 `Set_Fire()` 호출 시 해당 각도로 직선 발사됩니다.
`Rotate()`에서 대각선 길이와 삼각함수를 이용해 `POINT[3]`를 계산하는 방식은 무기 회전과 동일하지만, 여기서는 플레이어 좌표를 실시간으로 추적하여 각도를 갱신합니다.

<details class="code-block">
<summary>Belial_Sword.cpp — Rotate <span class="file-badge">보스 검 회전 좌표 계산</span></summary>
<pre markdown="0"><code class="language-cpp">void CBelial_Sword::Rotate() {
	if (!m_bFire) {
		POINT ptBullet { (LONG)m_tInfo.fX, (LONG)m_tInfo.fY };
		POINT ptPlayer { (LONG)CObjMgr::Get_Instance()->Get_Player()->Get_Collider_Info().fX, (LONG)CObjMgr::Get_Instance()->Get_Player()->Get_Collider_Info().fY };
		m_fAngle = CObjMgr::Get_Instance()->Find_Angle_AtoB(ptPlayer, ptBullet);

		float _fAngle = -m_fAngle - 90.f;

		float fDiagonal = sqrtf(powf((m_tInfo.fCX * 0.5f), 2) + powf((m_tInfo.fCY * 0.5f), 2));

		m_tPoint[0].x = LONG((m_tInfo.fCX * 0.5f) + (fDiagonal * cosf((_fAngle + 225.f) * (PI / 180.f))));
		m_tPoint[0].y = LONG((m_tInfo.fCY * 0.5f) + (fDiagonal * sinf((_fAngle + 225.f) * (PI / 180.f))));

		m_tPoint[1].x = LONG((m_tInfo.fCX * 0.5f) + (fDiagonal * cosf((_fAngle + 315.f) * (PI / 180.f))));
		m_tPoint[1].y = LONG((m_tInfo.fCY * 0.5f) + (fDiagonal * sinf((_fAngle + 315.f) * (PI / 180.f))));

		m_tPoint[2].x = LONG((m_tInfo.fCX * 0.5f) + (fDiagonal * cosf((_fAngle + 135.f) * (PI / 180.f))));
		m_tPoint[2].y = LONG((m_tInfo.fCY * 0.5f) + (fDiagonal * sinf((_fAngle + 135.f) * (PI / 180.f))));
	}
}</code></pre>
</details>

탄막은 매 호출마다 발사 각도를 5도씩 회전시키면서 90도 간격으로 4발을 동시에 생성합니다.
`m_bRight` 플래그로 회전 방향을 전환하여 시계/반시계 나선 패턴을 만들고, `CAbstractFactory<CBelial_Bullet>::Create()`로 탄막 인스턴스를 생성한 뒤 ObjMgr에 등록합니다.

<details class="code-block">
<summary>Boss_Belial.cpp — Create_Bullet <span class="file-badge">4방향 나선 탄막</span></summary>
<pre markdown="0"><code class="language-cpp">void CBoss_Belial::Create_Bullet() {
	CSoundMgr::Get_Instance()->PlaySoundW(L"SFX_Belial_Bullet.wav", SOUND_EFFECT, 1.f);

	if (m_bRight) { m_fAngle += 5.f; }
	else { m_fAngle -= 5.f; }

	CObj* pBullet = CAbstractFactory<CBelial_Bullet>::Create();
	pBullet->Set_Pos(m_tInfo.fX, (m_tInfo.fY + 110));
	pBullet->Set_Angle(m_fAngle);
	CObjMgr::Get_Instance()->Add_Object(OBJ_BULLET, pBullet);

	pBullet = CAbstractFactory<CBelial_Bullet>::Create();
	pBullet->Set_Pos(m_tInfo.fX, (m_tInfo.fY + 110));
	pBullet->Set_Angle((m_fAngle + 90.f));
	CObjMgr::Get_Instance()->Add_Object(OBJ_BULLET, pBullet);

	pBullet = CAbstractFactory<CBelial_Bullet>::Create();
	pBullet->Set_Pos(m_tInfo.fX, (m_tInfo.fY + 110));
	pBullet->Set_Angle((m_fAngle + 180.f));
	CObjMgr::Get_Instance()->Add_Object(OBJ_BULLET, pBullet);

	pBullet = CAbstractFactory<CBelial_Bullet>::Create();
	pBullet->Set_Pos(m_tInfo.fX, (m_tInfo.fY + 110));
	pBullet->Set_Angle((m_fAngle + 270.f));
	CObjMgr::Get_Instance()->Add_Object(OBJ_BULLET, pBullet);
}</code></pre>
</details>

### 던전 및 스테이지

Town → Dungeon 5층(F0~F4) → Boss 순서로 진행되는 스테이지 구조입니다.
StageMgr가 각 층의 인스턴스를 vector로 관리하며, 전진·후퇴 시 몬스터·아이템 상태를 보존합니다.
Gate 오브젝트를 통해 층간 이동이 이루어지며, 몬스터 전멸 시 다음 층이 개방됩니다.

스테이지 전환 시 현재 층의 오브젝트(Gate, Monster, Drop)를 `splice`로 스테이지 자체 리스트에 회수하여 상태를 보존하고, 새 스테이지의 `Initialize()`를 호출합니다.
보스 클리어 후 마을로 복귀하면 던전 전체를 `Safe_Delete`로 해제하여 다음 진입 시 새로 생성되도록 합니다.

<details class="code-block">
<summary>StageMgr.cpp — Set_Stage <span class="file-badge">스테이지 전환 및 상태 보존</span></summary>
<pre markdown="0"><code class="language-cpp">void CStageMgr::Set_Stage(STAGEID eID) {
	m_eCurStage = eID;

	if (m_ePrevStage != m_eCurStage) {
		CSoundMgr::Get_Instance()->StopAll();

		if (!(CObjMgr::Get_Instance()->Get_GateList()->empty())) {m_pStage->Get_GateList()->splice((m_pStage->Get_GateList()->end()), (*CObjMgr::Get_Instance()->Get_GateList())); }
		if (!(CObjMgr::Get_Instance()->Get_MonsterList()->empty())) { m_pStage->Get_MonsterList()->splice((m_pStage->Get_MonsterList()->end()), (*CObjMgr::Get_Instance()->Get_MonsterList())); }
		if (!(CObjMgr::Get_Instance()->Get_DropList()->empty())) { m_pStage->Get_DropList()->splice((m_pStage->Get_DropList()->end()), (*CObjMgr::Get_Instance()->Get_DropList())); }
		if (!(CObjMgr::Get_Instance()->Get_NPCList()->empty())) { m_pStage->Get_NPCList()->splice((m_pStage->Get_NPCList()->end()), (*CObjMgr::Get_Instance()->Get_NPCList())); }
		CObjMgr::Get_Instance()->Delete_Object(OBJ_BULLET);
		CObjMgr::Get_Instance()->Delete_Object(OBJ_UI);
		CObjMgr::Get_Instance()->Delete_RenderList();
		CTileMgr::Get_Instance()->Release();

		if (m_ePrevStage == ST_TOWN || m_ePrevStage == ST_BOSS) { Safe_Delete(m_pStage); }
		if ((m_ePrevStage == ST_DF4 && m_eCurStage == ST_BOSS) || m_eCurStage == ST_TOWN) { std::for_each(m_vecDungeon.begin(), m_vecDungeon.end(), Safe_Delete<CStage*>); }
		if (m_ePrevStage == ST_TOWN || m_eCurStage == ST_TOWN) {
			CObjMgr::Get_Instance()->Reset_KillMonster();
			CObjMgr::Get_Instance()->Set_KillBelial(false);
			m_bClear = false;
		}

		switch (m_eCurStage) {
		case ST_TOWN:
			m_pStage = new CTown;
			break;

		case ST_DF0:
			if (!m_vecDungeon[0]) { m_vecDungeon[0] = new CDungeon_F0; }

			if (m_ePrevStage == ST_DF1) { m_vecDungeon[0]->Set_Back(true); }

			m_pStage = m_vecDungeon[0];
			break;

		case ST_DF1:
			if (!m_vecDungeon[1]) { m_vecDungeon[1] = new CDungeon_F1; }

			if (m_ePrevStage == ST_DF0) { m_vecDungeon[1]->Set_Back(false); }
			else { m_vecDungeon[1]->Set_Back(true); }

			m_pStage = m_vecDungeon[1];
			break;

		case ST_DF2:
			if (!m_vecDungeon[2]) { m_vecDungeon[2] = new CDungeon_F2; }

			if (m_ePrevStage == ST_DF1) { m_vecDungeon[2]->Set_Back(false); }
			else { m_vecDungeon[2]->Set_Back(true); }

			m_pStage = m_vecDungeon[2];
			break;

		case ST_DF3:
			if (!m_vecDungeon[3]) { m_vecDungeon[3] = new CDungeon_F3; }

			if (m_ePrevStage == ST_DF2) { m_vecDungeon[3]->Set_Back(false); }
			else { m_vecDungeon[3]->Set_Back(true); }

			m_pStage = m_vecDungeon[3];
			break;

		case ST_DF4:
			if (!m_vecDungeon[4]) { m_vecDungeon[4] = new CDungeon_F4; }

			if (m_ePrevStage == ST_DF3) { m_vecDungeon[4]->Set_Back(false); }
			else { m_vecDungeon[4]->Set_Back(true); }

			m_pStage = m_vecDungeon[4];
			break;

		case ST_BOSS:
			m_pStage = new CBoss;
			break;
		}
		m_pStage->Initialize();

		m_ePrevStage = m_eCurStage;
	}

	static_cast<CPlayer*>(CObjMgr::Get_Instance()->Get_Player())->Set_KeyLock(false);
	static_cast<CPlayer*>(CObjMgr::Get_Instance()->Get_Player())->Set_Visible(true);
}</code></pre>
</details>

### 타일 에디터

Edit 씬에서 타일을 배치·삭제할 수 있는 자체 맵 에디터를 구현했습니다.
배경 타일(BackTile)과 충돌 타일(FrontTile)을 분리하여 관리하며, 파일 저장·로드를 통해 각 스테이지의 맵 데이터를 관리합니다.

### 아이템 및 경제

코인은 몬스터 처치 시 포물선 드롭 연출 후 바닥에 착지하며, 플레이어가 일정 반경(150px) 내에 접근하면 삼각함수 기반 호밍으로 자동 흡수됩니다.
인벤토리 슬롯 시스템으로 무기를 장착·교체할 수 있고, 상점(Shop)과 식당(Restaurant), 보물상자(TreasureChest) 시스템을 구현했습니다.

`DropItem()`은 아이템 상태에 따라 세 단계로 동작합니다.
스폰 직후(`m_bSpawn`)에는 포물선 공식으로 위로 튀어오르는 연출을 재생하고, 착지 후에는 중력 낙하를 적용합니다.
플레이어 픽업 범위 안에 들어온 코인(`m_bPickUp && ITEM_MONEY`)은 `Find_Target()`으로 플레이어 방향 각도를 구한 뒤 해당 방향으로 호밍 이동합니다.

<details class="code-block">
<summary>Item.cpp — DropItem <span class="file-badge">아이템 드롭 & 호밍 흡수</span></summary>
<pre markdown="0"><code class="language-cpp">void CItem::DropItem() {
	if (m_bSpawn) {
		float fJumpPower = m_fPower * m_fTime - GRAVITY * powf(m_fTime, 2) * 0.5f;
		if (fJumpPower < -16.f) { fJumpPower = -16.f; }

		m_tInfo.fY -= fJumpPower;
		m_fTime += 0.2f;
	}
	else if (!m_bSpawn && !m_bPickUp) {
		m_fFallSpeed += m_fSpeed;
		if (m_fFallSpeed > 16.f) { m_fFallSpeed = 16.f; }
		m_tInfo.fY += m_fFallSpeed;
	}
	else if (!m_bSpawn && m_bPickUp && m_eItemType == ITEM_MONEY) {
		Find_Target();

		m_tInfo.fX += m_fSpeed * cosf(m_fAngle * (PI / 180.f));
		m_tInfo.fY -= m_fSpeed * sinf(m_fAngle * (PI / 180.f));
	}
}

void CItem::Find_Target() {
    POINT ptTarget{}, ptItem{};

	ptTarget.x = (long)CObjMgr::Get_Instance()->Get_Player()->Get_Info().fX;
	ptTarget.y = (long)CObjMgr::Get_Instance()->Get_Player()->Get_Info().fY;

	ptItem.x = (long)m_tInfo.fX;
	ptItem.y = (long)m_tInfo.fY;

	m_fAngle = CObjMgr::Get_Instance()->Find_Angle_AtoB(ptTarget, ptItem);
}</code></pre>
</details>

### NPC 상호작용

5종 NPC(Shopper, Giant, InnKeeper, Commander, Butler)를 구현했습니다.
RECT 교차 판정으로 상호작용 범위를 감지하며, 플레이어가 근접하면 대화·거래 UI가 활성화됩니다.

### 렌더링 최적화

GDI 더블 버퍼링으로 화면 깜빡임을 방지하고, 타일 렌더링에 뷰포트 기반 컬링을 적용하여 화면 밖 타일의 렌더를 생략했습니다.

## GDI 이미지 회전과 성능 대응

WinAPI의 GDI로 이미지를 회전시키려면 일반적으로 픽셀 단위 변환이 필요해 프레임 저하가 심합니다.
GDI+를 전면 도입하면 해결할 수 있지만, 약 1개월의 한정된 개발 기간 안에 기존 GDI 기반 렌더링 파이프라인을 전부 전환하는 것은 비현실적이었습니다.

이를 해결하기 위해 **GDI+를 사용하지 않고** GDI의 `PlgBlt` 함수를 활용했습니다.
`PlgBlt`는 원본 사각형을 대상 평행사변형에 매핑하는 함수로, 삼각함수로 회전 각도에 따른 세 꼭짓점 좌표(`POINT[3]`)를 직접 계산하여 전달하면 GDI만으로 이미지 회전이 가능합니다.

이 방식을 무기 렌더링과 보스의 검 소환 연출 등 **회전이 반드시 필요한 최소한의 오브젝트에만 적용**하여, GDI+ 없이도 프레임 저하를 방지했습니다.