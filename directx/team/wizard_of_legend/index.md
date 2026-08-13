---
layout: project
title: Wizard of Legend 모작 (DirectX9)
subtitle: 쿼터뷰 로그라이크 액션 게임 팀 프로젝트
youtube_id: gHBg1JuK-28
period: 2024.07 (약 1개월)
team: 4인 (한규만[팀장], 이성호, 이세형, 김승태)
role: 스킬 시스템, UI, 최종 보스(Master Sura)
tech: [C++, DirectX9, FMOD, HLSL]
github: https://github.com/Pyke-Lee/SR-Team-Project
---

## 프로젝트 개요

Wizard of Legend를 모티브로 한 쿼터뷰 로그라이크 액션 게임입니다.
4인 팀 프로젝트로 진행했으며, 자체 제작한 DirectX9 프레임워크(GameObject–Component 구조, 프로토타입 클론 방식) 위에 게임을 구현했습니다.
저는 이 프로젝트에서 **스킬 캐스팅 시스템, 상태창 UI, 최종 보스(Master Sura)**를 담당했습니다.

속성별 마법(불·공기·물·번개·혼돈)을 퀵슬롯에 장착해 조합하는 것이 핵심 재미이며, 각 스킬은 팀장이 잡아준 `CSkill` 기반 프레임 위에서 실제 동작을 구현하는 방식으로 만들었습니다.

## 스킬 캐스팅 시스템

### 퀵슬롯과 쿨다운 구조

플레이어는 5개의 퀵슬롯(좌클릭·스페이스·우클릭·Q·E)에 스킬을 장착합니다.
각 슬롯은 `SKILL` 열거형 값으로 어떤 스킬이 장착됐는지 관리하고, `COOLDOWN` 구조체 배열(`m_tCooldown`)로 슬롯별 쿨타임을 관리합니다.
`Key_Input`에서 입력을 감지하면 해당 슬롯의 쿨다운을 확인한 뒤, 장착된 스킬 종류에 따라 대응하는 `Cast_*` 함수를 호출합니다.

<details class="code-block">
<summary>Player.h <span class="file-badge">플레이어 클래스 구조</span></summary>
<pre markdown="0"><code class="language-cpp">#pragma once

#include "Unit.h"
#include "Define.h"
#include "Casting.h"

BEGIN(Engine)

class CCalculator;

END

class CPlayer : public Engine::CUnit {
public:
enum PLAYERHOOD { HOOD_BEGIN = -1, RED, YELLOW, GRAY, HOOD_END };
enum PLAYERMOTION {
MOTION_BEGIN = -1,
IDLE,
RUN,
DASH,
DEAD,
PUNCH,
SLAM,
DANCE,
MOTION_END
};
enum PLAYERDIRECTION {
DIR_BEGIN = -1,
BACK,
FRONT,
LEFT,
RIGHT,
DIR_END
};
enum QUICKSLOT {
SLOT_LB,
SLOT_SPACE,
SLOT_RB,
SLOT_Q,
SLOT_E,
SLOT_END
};

private:
explicit CPlayer(LPDIRECT3DDEVICE9 pGraphicDevice);
virtual ~CPlayer() {}

public:
virtual HRESULT Ready_GameObject();
virtual _int Update_GameObject(const _float&amp; fTimeDelta);
virtual void LateUpdate_GameObject(const _float&amp; fTimeDelta);
virtual void Render_GameObject();

public:
const _bool&amp; Get_Casting() { return m_bCasting; }
const SKILL&amp; Get_QuickSlot(const QUICKSLOT&amp; eSlot) { return m_eQuickSlot[eSlot]; }
Engine::SKILL* Get_pQuickSlot() { return m_eQuickSlot; }
Engine::RELIC* Get_pRelicSlot() { return m_eRelicSlot; }
const PLAYERHOOD&amp; Get_Hood() { return m_eHood; }
const COOLDOWN&amp; Get_Cooldown(QUICKSLOT eSlot) { return m_tCooldown[eSlot]; }
_int Get_Direction() override { return (_int)m_eDirection; }

public:
void Set_QuickSlot(const QUICKSLOT&amp; eSlot, const SKILL&amp; eSkill) { m_eQuickSlot[eSlot] = eSkill; }
void Set_Hood(const PLAYERHOOD&amp; eHood) { m_eHood = eHood; }
void Set_Render(const _bool&amp; isRender) { m_bRender = isRender; }
void Set_Collision(const _bool&amp; bCollision) { m_bCollision = bCollision; }
void Get_Relic(const RELIC&amp; Relic);
void Equip_Relic(const RELIC&amp; Relic);
void Get_Skill(const SKILL&amp; Skill);
void Add_Relic_Stat(const RELIC&amp; Relic);
void Sub_Relic_Stat(const RELIC&amp; Relic);
void Set_Idle();
void Clear_State();
void Set_BackView() {
m_bCamera = true;
m_bFix = true;
}
void Set_QuaterView() {
m_bCamera = false;
m_bFix = false;
}
void Set_Rotation(const _float&amp; fRad);
void Change_Camera();
void Set_Motion(PLAYERMOTION eMotion) { m_eMotion = eMotion; }
void Set_Stun(const _bool&amp; bStun = true);
void Check_Stun(const _float&amp; fTimeDelta);
void Check_Hood();

	void Make_BigTeleport();
	void Make_SmallTeleport();
	const _bool&amp; Is_Teleport() { return m_bTeleport; }
	void Set_FinalBoss_Pos(const _float&amp; fX, const _float&amp; fZ) { m_vFinalBossPos = { fX, 1.5f, fZ }; }
	void Move_FinalBoss_Pos();
	void Set_Direction(PLAYERDIRECTION eDir) { m_eDirection = eDir; }
	void Set_Token(const _bool&amp; bToken) { m_bToken = bToken; }
	const _bool&amp; Get_Token() { return m_bToken; }
	virtual void	Add_Hp() override; 

public:
static CPlayer* Create(LPDIRECT3DDEVICE9 pGraphicDev);

private:
HRESULT Add_Component();
void Key_Input(const _float&amp; fTimeDelta);
void Mouse_Move(const _float&amp; fTimeDelta);
void Mouse_Fix();
void Move_Frame(const _float&amp; fTimeDelta);
void Update_Cooldown(const _float&amp; fTimeDelta);
void Resurrection();

private:
void Cast_Casting();
void Cast_ShockNova();
void Cast_DistortionBeam();
void Cast_NullParade();
void Cast_ChaosAssault();
void Cast_RagingInferno();
void Cast_SnowflakeChakrams();
void Cast_FlameDash();
void Cast_WindSlash();
void Cast_ChaosCrusher();

	void Teleport();
	void Find_EndPoint(_vec3&amp; vEndPoint);

private:
virtual void After_Hit(
const _bool&amp; isCri,
const _int&amp; Damage,
const DAMAGETYPE&amp; damagetype,
const _vec3&amp; vInverseDir) override;

private:
virtual void Free();

private:
Engine::CCalculator* m_pCalculatorCom = nullptr;
Engine::CTexture* m_pTextureCom[PLAYERHOOD::HOOD_END][PLAYERMOTION::MOTION_END][PLAYERDIRECTION::DIR_END];

	FRAME m_tFrame;

	PLAYERHOOD m_eHood = PLAYERHOOD::RED;
	PLAYERHOOD m_ePreHood = PLAYERHOOD::HOOD_END;
	PLAYERMOTION m_eMotion = PLAYERMOTION::RUN;
	PLAYERDIRECTION m_eDirection = PLAYERDIRECTION::BACK;

	_bool m_bToken = false;
	_bool m_bDead = false;
	_bool m_bStun = false;
	_bool m_bDash = false;
	_bool m_bCamera = false;
	_bool m_bFix = false;
	_bool m_bPunch = false;
	_bool m_bSlam = false;
	_bool m_bCasting = false;
	_float m_fSpeed = 16.f;
	_float m_fDashTimer {};
	_float m_fStunTimeSum = 0.f;
	_float m_fStunDuration = 1.5f;
	_bool m_bSuperCarrotCake = false;
	_int m_iSuperCarrotCake = 0;
	_int m_iSuperCarrotCakeMax = 75;

	// Teleport
	_vec3 m_vTargetPos {};
	_vec3 m_vTeleportDir {};
	_float m_fTeleportDistance = 7.f;
	_float m_fTeleportCoolTime = 0.7f;
	_float m_fTeleportTimer = m_fTeleportCoolTime;
	_bool m_bTeleport {};
	_bool m_bMakeSmallTelport {};

	CSkill* m_pCasting = nullptr;

	Engine::SKILL m_eQuickSlot[SLOT_END] = {AIR_WIND_SLASH, SKILL_NONE, SKILL_NONE, SKILL_NONE, SKILL_NONE };
	//Engine::SKILL m_eQuickSlot[SLOT_END] = { CHAOS_CHAOS_CRUSHER, CHAOS_CHAOTIC_RIFT, CHAOS_NULL_PARADE, CHAOS_DISTORTION_BEAM, CHAOS_DEATH_TORNADO };
	COOLDOWN m_tCooldown[SLOT_END] = {};

	//	Gyuman Temp Add
	Engine::RELIC m_eRelicSlot[10] = { MISC_ROXELS_PENDULUM, RELIC_NONE, RELIC_NONE, RELIC_NONE, RELIC_NONE,
									  RELIC_NONE, RELIC_NONE, RELIC_NONE, RELIC_NONE, RELIC_NONE };
	_int m_iRelicCount = 1;

	_bool m_bRender = true;

	_vec3 m_vFinalBossPos { 0.f, 0.f, 0.f };
};</code></pre>
</details>

`Key_Input`은 이동(WASD)·대시(스페이스)·공격(마우스/Q/E) 입력을 처리합니다.
각 공격 입력마다 먼저 해당 슬롯의 쿨다운이 남아 있는지 검사하고, 남아 있지 않으면 장착된 스킬에 맞는 `Cast_*` 함수를 호출하는 구조입니다.
대시 상태에서는 삼각함수 기반 감속 곡선(`cosf`)으로 대시 이동을 처리합니다.

<details class="code-block">
<summary>Player.cpp — Key_Input <span class="file-badge">입력·쿨다운·캐스팅 분기</span></summary>
<pre markdown="0"><code class="language-cpp">void CPlayer::Key_Input(const _float &amp;fTimeDelta)
{
	// INFO UI 온 오프
	if (Engine::Get_DIKeyDown(DIK_TAB) &amp;&amp; (!Engine::Is_ActiveUI() || Engine::Get_Render(CUIMgr::UI_ID::INFO)))
	{
		CSoundMgr::GetInstance()-&gt;PlaySound(L"Player/PaperFlap3.wav", SOUND_EFFECT, 0.8f); // 플레이어 정보창 사운드
		if (Engine::Get_Render(CUIMgr::UI_ID::INFO))
		{
			Engine::InActive_UI(CUIMgr::UI_ID::INFO);
		}
		else
		{
			Engine::Active_UI(CUIMgr::UI_ID::INFO);
		}
	}

	if (Engine::Get_DIKeyDown(DIK_ESCAPE) &amp;&amp; Engine::Get_Render(CUIMgr::UI_ID::INFO))
	{
		CSoundMgr::GetInstance()-&gt;PlaySound(L"Player/PaperFlap3.wav", SOUND_EFFECT, 0.8f); // ESC 키 사운드
		Engine::InActive_UI(CUIMgr::UI_ID::INFO);
	}
		

	if (CUIMgr::GetInstance()-&gt;Is_ActiveUI())
	{
		return;
	}

	_vec3 vDirX{0.f, 0.f, 0.f}, vDirZ{0.f, 0.f, 0.f};

	m_pTransformCom-&gt;Get_Info(INFO_LOOK, &amp;vDirZ);
	m_pTransformCom-&gt;Get_Info(INFO_RIGHT, &amp;vDirX);
	VEC3NORMAL(&amp;vDirX);
	VEC3NORMAL(&amp;vDirZ);

	if (!m_bDead &amp;&amp; !m_bDash &amp;&amp; !m_bPunch &amp;&amp; !m_bSlam &amp;&amp; !m_bStun)
	{
		if (Engine::Get_DIKeyState(DIK_W) &amp; 0x80)
		{
			m_pTransformCom-&gt;Move_Pos(&amp;vDirZ, fTimeDelta, m_fSpeed);
			if (m_eDirection != PLAYERDIRECTION::BACK || m_eMotion != PLAYERMOTION::RUN)
			{
				m_eMotion = PLAYERMOTION::RUN;
				m_eDirection = PLAYERDIRECTION::BACK;
				m_tFrame.iFrameStart = 0;
				m_tFrame.iFrameEnd = 5;
				m_tFrame.fChangeSec = 0.1f;
				m_tFrame.fTimeSum = 0.f;
				//CSoundMgr::GetInstance()-&gt;PlaySound(L"Player/PlayerFootstep.wav", SOUND_EFFECT, 0.6f); // 걷기 사운드
			}
		}
		else if (Engine::Get_DIKeyState(DIK_S) &amp; 0x80)
		{
			m_pTransformCom-&gt;Move_Pos(&amp;vDirZ, fTimeDelta, -m_fSpeed);
			if (m_eDirection != PLAYERDIRECTION::FRONT || m_eMotion != PLAYERMOTION::RUN)
			{
				m_eMotion = PLAYERMOTION::RUN;
				m_eDirection = PLAYERDIRECTION::FRONT;
				m_tFrame.iFrameStart = 0;
				m_tFrame.iFrameEnd = 5;
				m_tFrame.fChangeSec = 0.1f;
				m_tFrame.fTimeSum = 0.f;
				//CSoundMgr::GetInstance()-&gt;PlaySound(L"Player/PlayerFootstep.wav", SOUND_EFFECT, 0.6f); // 걷기 사운드
			}
		}
		else if (Engine::Get_DIKeyState(DIK_A) &amp; 0x80)
		{
			m_pTransformCom-&gt;Move_Pos(&amp;vDirX, fTimeDelta, -m_fSpeed);
			if (m_eDirection != PLAYERDIRECTION::LEFT || m_eMotion != PLAYERMOTION::RUN)
			{
				m_eMotion = PLAYERMOTION::RUN;
				m_eDirection = PLAYERDIRECTION::LEFT;
				m_tFrame.iFrameStart = 0;
				m_tFrame.iFrameEnd = 3;
				m_tFrame.fChangeSec = 0.1f;
				m_tFrame.fTimeSum = 0.f;
				//CSoundMgr::GetInstance()-&gt;PlaySound(L"Player/PlayerFootstep.wav", SOUND_EFFECT, 0.6f); // 걷기 사운드
			}
		}
		else if (Engine::Get_DIKeyState(DIK_D) &amp; 0x80)
		{
			m_pTransformCom-&gt;Move_Pos(&amp;vDirX, fTimeDelta, m_fSpeed);
			if (m_eDirection != PLAYERDIRECTION::RIGHT || m_eMotion != PLAYERMOTION::RUN)
			{
				m_eMotion = PLAYERMOTION::RUN;
				m_eDirection = PLAYERDIRECTION::RIGHT;
				m_tFrame.iFrameStart = 0;
				m_tFrame.iFrameEnd = 3;
				m_tFrame.fChangeSec = 0.1f;
				m_tFrame.fTimeSum = 0.f;
				//CSoundMgr::GetInstance()-&gt;PlaySound(L"Player/PlayerFootstep.wav", SOUND_EFFECT, 0.6f); // 걷기 사운드
			}
		}
		else
		{
			m_eMotion = PLAYERMOTION::IDLE;
			m_tFrame.iFrameStart = 0;
			m_tFrame.iFrameEnd = 0;
			m_tFrame.fChangeSec = 0.f;
			m_tFrame.fTimeSum = 0.f;
		}

		if (!m_bDead)
		{
			if (Engine::Get_DIKeyDown(DIK_SPACE))
			{
				if (m_bDash || (m_eQuickSlot[SLOT_SPACE] == CHAOS_CHAOTIC_RIFT &amp;&amp; m_fTeleportTimer &lt; m_fTeleportCoolTime))
				{
					return;
				}

				m_fDashTimer = 0.f;
				m_fTeleportTimer = 0.f;
				m_bDash = true;
				m_eMotion = PLAYERMOTION::DASH;
				m_tFrame.iFrameStart = 0;

				if (m_eQuickSlot[SLOT_SPACE] == SKILL_NONE || ((m_eQuickSlot[SLOT_SPACE] == CHAOS_CHAOTIC_RIFT || m_eQuickSlot[SLOT_SPACE] == FIRE_FLAME_DASH) &amp;&amp; m_tCooldown[SLOT_SPACE].fCooldown &gt; m_tCooldown[SLOT_SPACE].fTimeSum)) {
					CSoundMgr::GetInstance()-&gt;PlaySound(L"Player/StandardDash.wav", SOUND_EFFECT, 0.7f); // 대쉬 키 사운드
				}

				if (m_eDirection == PLAYERDIRECTION::BACK)
				{
					m_tFrame.iFrameEnd = 2;
				}
				else if (m_eDirection == PLAYERDIRECTION::FRONT)
				{
					m_tFrame.iFrameEnd = 3;
				}
				else if (m_eDirection == PLAYERDIRECTION::LEFT || m_eDirection == PLAYERDIRECTION::RIGHT)
				{
					m_tFrame.iFrameEnd = 5;
				}
				m_tFrame.fChangeSec = 0.2f;
				m_tFrame.fTimeSum = 0.f;

				switch (m_eQuickSlot[SLOT_SPACE]) {
				case FIRE_FLAME_DASH:
					Cast_FlameDash();
					break;

				case CHAOS_CHAOTIC_RIFT:
					Make_BigTeleport();
					break;
				}
			}

			if (Engine::Get_DIMouseDown(DIM_LB))
			{
				if (!m_bPunch)
				{
					m_eMotion = PLAYERMOTION::PUNCH;
					m_tFrame.iFrameStart = 0;
					m_tFrame.iFrameEnd = 1;
					m_tFrame.fChangeSec = 0.15f;
					m_tFrame.fTimeSum = 0.f;
					m_bPunch = true;

					if (m_tCooldown[SLOT_LB].fCooldown &gt; m_tCooldown[SLOT_LB].fTimeSum)
					{
						return;
					}

					if (m_bCamera)
					{
						m_eDirection = PLAYERDIRECTION::BACK;
					}

					switch (m_eQuickSlot[SLOT_LB])
					{
					case AIR_WIND_SLASH:
						CSoundMgr::GetInstance()-&gt;PlaySound(L"Player/StandardSpinSingle.wav", SOUND_EFFECT, 0.8f);
						Cast_WindSlash();
						break;

					case CHAOS_CHAOS_CRUSHER:
						CSoundMgr::GetInstance()-&gt;PlaySound(L"Skill/Chaos/ChaosBeamStart.wav", SOUND_EFFECT, 0.8f);
						Cast_ChaosCrusher();
						break;
					}
				}
			}

			if (Engine::Get_DIMouseDown(DIM_RB))
			{
				if (m_tCooldown[SLOT_RB].fCooldown &gt; m_tCooldown[SLOT_RB].fTimeSum)
				{
					return;
				}

				switch (m_eQuickSlot[SLOT_RB])
				{
				case FIRE_RAGING_INFERNO:
					CSoundMgr::GetInstance()-&gt;PlaySound(L"Skill/Fire/FlameSpinUp.wav", SOUND_EFFECT, 0.8f);
					Cast_RagingInferno();
					break;

				case CHAOS_NULL_PARADE:
					Cast_NullParade();
					break;
				}
			}

			if (Engine::Get_DIKeyState(DIK_Q))
			{
				if (m_tCooldown[SLOT_Q].fCooldown &gt; m_tCooldown[SLOT_Q].fTimeSum)
				{
					return;
				}

				switch (m_eQuickSlot[SLOT_Q])
				{
				case LIGHTNING_SHOCK_NOVA:
					Cast_Casting();
					break;

				case CHAOS_DISTORTION_BEAM:
					Cast_DistortionBeam();
					break;
				}
			}

			if (Engine::Get_DIKeyDown(DIK_E))
			{
				if (m_tCooldown[SLOT_E].fCooldown &gt; m_tCooldown[SLOT_E].fTimeSum)
				{
					return;
				}

				switch (m_eQuickSlot[SLOT_E])
				{
				case WATER_SNOWFLAKE_CHAKRAMS:
					CSoundMgr::GetInstance()-&gt;PlaySound(L"Skill/waterSnowLake.wav", SOUND_EFFECT, 0.8f);
					Cast_SnowflakeChakrams();
					break;

				case CHAOS_DEATH_TORNADO:
					CSoundMgr::GetInstance()-&gt;PlaySound(L"Skill/Chaos/waterSnowLake.wav", SOUND_EFFECT, 0.8f);
					Cast_ChaosAssault();
					break;
				}
			}

			if (Engine::Get_DIKeyDown(DIK_F5))
			{
				Change_Camera();
			}
		}
	}
	
	if (!m_bDead &amp;&amp; !m_bDash &amp;&amp; !m_bPunch &amp;&amp; !m_bStun) {
		if (Engine::Get_DIKeyState(DIK_Q)) {
			if (m_tCooldown[SLOT_Q].fCooldown &gt; m_tCooldown[SLOT_Q].fTimeSum) {
				return;
			}

			switch (m_eQuickSlot[SLOT_Q]) {
			case LIGHTNING_SHOCK_NOVA:
				Cast_Casting();
				break;

			case CHAOS_DISTORTION_BEAM:
				Cast_DistortionBeam();
				break;
			}
		}
	}

	if (m_bDash)
	{
		_vec3 vLook{};
		_matrix matRotation{};
		m_pTransformCom-&gt;Get_Info(INFO::INFO_LOOK, &amp;vLook);
		vLook.y = 0.f;
		D3DXVec3Normalize(&amp;vLook, &amp;vLook);

		switch (m_eDirection)
		{
		case PLAYERDIRECTION::LEFT:
			D3DXMatrixRotationY(&amp;matRotation, D3DXToRadian(270.f));
			D3DXVec3TransformNormal(&amp;vLook, &amp;vLook, &amp;matRotation);
			m_fDashTimer += fTimeDelta;
			m_pTransformCom-&gt;Move_Pos(&amp;vLook, 0.1f, 4.5f * cosf(D3DXToRadian(190.f * m_fDashTimer)));
			break;
		case PLAYERDIRECTION::RIGHT:
			D3DXMatrixRotationY(&amp;matRotation, D3DXToRadian(90.f));
			D3DXVec3TransformNormal(&amp;vLook, &amp;vLook, &amp;matRotation);
			m_fDashTimer += fTimeDelta;
			m_pTransformCom-&gt;Move_Pos(&amp;vLook, 0.1f, 4.5f * cosf(D3DXToRadian(190.f * m_fDashTimer)));
			break;
		case PLAYERDIRECTION::BACK:
			m_fDashTimer += fTimeDelta;
			m_pTransformCom-&gt;Move_Pos(&amp;vLook, 0.1f, 4.5f * cosf(D3DXToRadian(190.f * m_fDashTimer)));
			break;
		case PLAYERDIRECTION::FRONT:
			D3DXMatrixRotationY(&amp;matRotation, D3DXToRadian(180.f));
			D3DXVec3TransformNormal(&amp;vLook, &amp;vLook, &amp;matRotation);
			m_fDashTimer += fTimeDelta;
			m_pTransformCom-&gt;Move_Pos(&amp;vLook, 0.1f, 4.5f * cosf(D3DXToRadian(190.f * m_fDashTimer)));
			break;
		}

		// Check Over TargetPos
		_vec3 vPlayerPos{};
		m_pTransformCom-&gt;Get_Info(INFO_POS, &amp;vPlayerPos);
		if (m_bTeleport)
		{
			if (D3DXVec3Dot(&amp;vLook, &amp;(vPlayerPos - m_vTargetPos)) &gt; 0.f)
				m_pTransformCom-&gt;Set_Pos(m_vTargetPos);
		}

		if (m_bTeleport)
			Make_SmallTeleport();
	}

#pragma region DEBUG KEY
if (Engine::Get_DIKeyDown(DIK_F1)) { if (m_bDead) { Resurrection(); } } // 부활
else if (Engine::Get_DIKeyDown(DIK_F2)) { m_iHp = m_iMaxHp; } // 체력 100% 회복
else if (Engine::Get_DIKeyDown(DIK_F3)) { m_iMana = m_iMaxMana; } // 마나 100% 회복
#ifdef _DEBUG
else if (Engine::Get_DIKeyDown(DIK_F4)) { m_iMoney += 1000; } // 골드 1000 획득
else if (Engine::Get_DIKeyDown(DIK_F8)) { _vec3 vPos { 0.f, 0.f, 0.f }; m_pTransformCom-&gt;Get_Info(INFO::INFO_POS, &amp;vPos); cout &lt;&lt; vPos.x &lt;&lt; " " &lt;&lt; vPos.y &lt;&lt; " " &lt;&lt; vPos.z &lt;&lt; endl; } // 콘솔에 위치 정보 출력
#endif
#pragma endregion
}</code></pre>
</details>

`Update_Cooldown`은 매 프레임 모든 슬롯의 쿨다운 타이머를 누적합니다.
`Cast_ShockNova`는 마나가 가득 찼을 때(`m_iMana == m_iMaxMana`)는 상하좌우 4방향으로, 아닐 때는 중앙 한 방향으로 스킬을 생성하는 마나 소모형 강화 캐스팅입니다.
스킬을 생성한 뒤에는 해당 스킬의 쿨다운 값을 슬롯에 세팅합니다.

<details class="code-block">
<summary>Player.cpp — Update_Cooldown / Cast_ShockNova <span class="file-badge">쿨다운 갱신·마나 소모 캐스팅</span></summary>
<pre markdown="0"><code class="language-cpp">void CPlayer::Update_Cooldown(const _float &amp;fTimeDelta)
{
	for (_uint i = 0; i &lt; SLOT_END; ++i)
	{
		if (m_tCooldown[i].fCooldown &gt; m_tCooldown[i].fTimeSum)
		{
			m_tCooldown[i].fTimeSum += fTimeDelta;
		}
		if (m_tCooldown[i].fCooldown &lt; m_tCooldown[i].fTimeSum)
		{
			m_tCooldown[i].fCooldown = m_tCooldown[i].fTimeSum;
		}
	}
}

void CPlayer::Cast_ShockNova()
{
if (m_tCooldown[SLOT_Q].fCooldown &gt; m_tCooldown[SLOT_Q].fTimeSum)
{
return;
}

	CSkill *pSkill = nullptr;

	if (m_iMana == m_iMaxMana)
	{
		m_iMana = 0;

		pSkill = CShockNova::Create(m_pGraphicDev);
		NULL_CHECK_RETURN(pSkill, );
		dynamic_cast&lt;CShockNova *&gt;(pSkill)-&gt;Set_Direction(CShockNova::LEFT);
		Engine::Add_PlayerSkill(pSkill);

		pSkill = CShockNova::Create(m_pGraphicDev);
		NULL_CHECK_RETURN(pSkill, );
		dynamic_cast&lt;CShockNova *&gt;(pSkill)-&gt;Set_Direction(CShockNova::RIGHT);
		Engine::Add_PlayerSkill(pSkill);

		pSkill = CShockNova::Create(m_pGraphicDev);
		NULL_CHECK_RETURN(pSkill, );
		dynamic_cast&lt;CShockNova *&gt;(pSkill)-&gt;Set_Direction(CShockNova::UP);
		Engine::Add_PlayerSkill(pSkill);

		pSkill = CShockNova::Create(m_pGraphicDev);
		NULL_CHECK_RETURN(pSkill, );
		dynamic_cast&lt;CShockNova *&gt;(pSkill)-&gt;Set_Direction(CShockNova::DOWN);
		Engine::Add_PlayerSkill(pSkill);
	}
	else
	{
		pSkill = CShockNova::Create(m_pGraphicDev);
		NULL_CHECK_RETURN(pSkill, );
		dynamic_cast&lt;CShockNova *&gt;(pSkill)-&gt;Set_Direction(CShockNova::CENTER);
		Engine::Add_PlayerSkill(pSkill);
	}

	m_tCooldown[SLOT_Q] = {pSkill-&gt;Get_CoolDown(), 0.f};
}</code></pre>
</details>

## 속성별 스킬 구현

`CSkill` 기반 클래스의 구조와 프레임은 팀장이 설계했고, 저는 그 위에서 각 속성 스킬의 실제 동작(생성·방향·프레임·충돌)을 구현했습니다.

### ShockNova (번개)

번개 속성 스킬로, `Set_Direction`으로 플레이어 기준 상하좌우/중앙 위치에 노바를 배치합니다.
플레이어의 Look·Right 벡터를 정규화해 방향별로 위치를 계산하고, 원형 충돌체(`Set_Default_Circle`)를 설정합니다.
`Move_Frame`으로 스프라이트 프레임을 진행시키고, 마지막 프레임에 도달하면 스스로 사망 처리됩니다.

<details class="code-block">
<summary>ShockNova.cpp <span class="file-badge">번개 노바 스킬</span></summary>
<pre markdown="0"><code class="language-cpp">#include "stdafx.h"
#include "ShockNova.h"
#include "Export_System.h"
#include "Export_Utility.h"
#include "Player.h"
#include "SoundMgr.h"

CShockNova::CShockNova(LPDIRECT3DDEVICE9 pGraphicDevice) : Engine::CSkill(pGraphicDevice) {
}

HRESULT CShockNova::Ready_GameObject() {
FAILED_CHECK_RETURN(Add_Component(), E_FAIL);
m_pTransformCom-&gt;Set_Scale(8.f, 8.f, 8.f);
m_pTransformCom-&gt;Set_Rotation(ROT_X, D3DXToRadian(90.f));
m_tFrame.iFrameStart = 0;
m_tFrame.iFrameEnd = 7;
m_tFrame.fChangeSec = 0.1f;
m_tFrame.fTimeSum = 0.f;
m_bCollision = true;

	m_fCooldown = 8.f;

	// ������ �Ը� �ۼ�
	m_pTransformCom-&gt;Update_Component(0.f);
	m_pCollider-&gt;Set_Default_Circle(m_pTransformCom, 7.5f);
	m_eSkillType = LIGHTNING_SHOCK_NOVA;
	m_fAttackDelay = 1.f;

	CSoundMgr::GetInstance()-&gt;PlaySound(L"Skill/Light/LightningBurst.wav", SOUND_EFFECT, 0.8f);

	return S_OK;
}

_int CShockNova::Update_GameObject(const _float&amp; fTimeDelta) {
Move_Frame(fTimeDelta);

	if (m_bDead) { CSoundMgr::GetInstance()-&gt;StopSound(SOUND_EFFECT); return OBJ_DEAD; }

	return Engine::CSkill::Update_GameObject(fTimeDelta);
}

void CShockNova::LateUpdate_GameObject(const _float&amp; fTimeDelta) {
Engine::CSkill::LateUpdate_GameObject(fTimeDelta);
}

void CShockNova::Render_GameObject() {
m_pGraphicDev-&gt;SetTransform(D3DTS_WORLD, m_pTransformCom-&gt;Get_WorldMatrix());
m_pGraphicDev-&gt;SetRenderState(D3DRS_CULLMODE, D3DCULL_NONE);

	m_pTextureCom-&gt;Render_Texture(m_tFrame.iFrameStart);
	m_pBufferCom-&gt;Render_Buffer();

	m_pGraphicDev-&gt;SetRenderState(D3DRS_CULLMODE, D3DCULL_CCW);
}

void CShockNova::Set_Direction(SkillDir eDir) {
CTransform* pPlayerTransform = dynamic_cast&lt;CTransform*&gt;(Engine::Get_Component(ID_DYNAMIC, L"GameLogic", L"Player", L"Com_Transform"));
_vec3 vPos { 0.f, 0.f, 0.f }, vLook { 0.f, 0.f, 0.f }, vRight { 0.f, 0.f, 0.f };
pPlayerTransform-&gt;Get_Info(INFO_POS, &amp;vPos);
pPlayerTransform-&gt;Get_Info(INFO_LOOK, &amp;vLook);
pPlayerTransform-&gt;Get_Info(INFO_RIGHT, &amp;vRight);
VEC3NORMAL(&amp;vLook);
VEC3NORMAL(&amp;vRight);

	switch (eDir) {
		case SkillDir::LEFT:
			vPos -= vRight * 6.f;
			break;

		case SkillDir::RIGHT:
			vPos += vRight * 6.f;
			break;

		case SkillDir::UP:
			vPos += vLook * 6.f;
			break;

		case SkillDir::DOWN:
			vPos -= vLook * 6.f;
			break;
	}

	m_pTransformCom-&gt;Set_Pos(vPos.x, 0.1f, vPos.z);
}

void CShockNova::Set_Pos(CTransform* pTransform) {
_vec3 vPos { 0.f, 0.f, 0.f };
pTransform-&gt;Get_Info(INFO_POS, &amp;vPos);

	m_pTransformCom-&gt;Set_Pos(vPos.x, 0.1f, vPos.z);
}

void CShockNova::Attack_Routine(CUnit* Target)
{
//_vec3 vPlayerPos{}, vTargetPos{};
//CTransform* pPlayerTransform = Engine::Get_Player()-&gt;Get_Transform_Component();
//pPlayerTransform-&gt;Get_Info(INFO_POS, &amp;vPlayerPos);
//Target-&gt;Get_Transform_Component()-&gt;Get_Info(INFO_POS, &amp;vTargetPos);

	//vPlayerPos.y = 0.f;
	//vTargetPos.y = 0.f;

	//static_cast&lt;CPlayer*&gt;(Engine::Get_Player())-&gt;Add_Mana(5);

	//_vec3 vCenterPos{};
	//m_pTransformCom-&gt;Get_Info(INFO_POS, &amp;vCenterPos);
	//Target-&gt;Take_Attack(5, 0.1f, vTargetPos - vPlayerPos, 1, 0.5f, vCenterPos, PROPERTY::LIGHTNING);
}

CShockNova* CShockNova::Create(LPDIRECT3DDEVICE9 pGraphicDevice) {
CShockNova* pInstance = new CShockNova(pGraphicDevice);

	if (FAILED(pInstance-&gt;Ready_GameObject())) {
		MSG_BOX("ShockNova Create Failed");
		Engine::Safe_Release(pInstance);
	}

	return pInstance;
}

HRESULT CShockNova::Add_Component() {
CComponent* pComponent = nullptr;

	pComponent = m_pBufferCom = dynamic_cast&lt;CRcTex*&gt;(Engine::Clone_Proto(L"Proto_RcTex"));
	NULL_CHECK_RETURN(pComponent, E_FAIL);
	m_mapComponent[ID_STATIC].insert({ L"Com_Buffer", pComponent });

	pComponent = m_pTransformCom = dynamic_cast&lt;CTransform*&gt;(Engine::Clone_Proto(L"Proto_Transform"));
	NULL_CHECK_RETURN(pComponent, E_FAIL);
	m_mapComponent[ID_DYNAMIC].insert({ L"Com_Transform", pComponent });

	pComponent = m_pTextureCom = dynamic_cast&lt;CTexture*&gt;(Engine::Clone_Proto(L"Proto_Skill_ShockNova"));
	NULL_CHECK_RETURN(pComponent, E_FAIL);
	m_mapComponent[ID_STATIC].insert({ L"Com_Texture", pComponent });

	pComponent = m_pCollider = dynamic_cast&lt;CCollider*&gt;(Engine::Clone_Proto(L"Proto_Collider"));
	NULL_CHECK_RETURN(pComponent, E_FAIL);
	m_mapComponent[ID_STATIC].insert({ L"Com_Collider", pComponent });

	return S_OK;
}

void CShockNova::Move_Frame(const _float&amp; fTimeDelta) {
if (m_tFrame.fChangeSec &lt; m_tFrame.fTimeSum &amp;&amp; m_tFrame.fChangeSec != 0.f) {
++m_tFrame.iFrameStart;
m_tFrame.fTimeSum = 0.f;
}
else { m_tFrame.fTimeSum += fTimeDelta; }

	if (m_tFrame.iFrameStart &gt; m_tFrame.iFrameEnd) { m_bDead = true; }
}

void CShockNova::Free() {
Engine::CSkill::Free();
}</code></pre>
</details>

### WindSlash (공기)

기본 근접 공격으로 쓰이는 공기 속성 참격입니다.
`Set_Direction`에서 플레이어의 바라보는 각도(`fAngle`)에 방향별 오프셋을 더해 참격을 회전시키고, 좌우 텍스처를 무작위로 골라(`m_bRight`) 좌우 스윙을 번갈아 표현합니다.
사각 충돌체(`Set_Default_Square`)를 사용하며, 충돌 카운트가 일정 수(4)에 도달하면 충돌을 비활성화해 다단히트를 제한합니다.

<details class="code-block">
<summary>WindSlash.cpp <span class="file-badge">공기 참격 스킬</span></summary>
<pre markdown="0"><code class="language-cpp">#include "stdafx.h"
#include "WindSlash.h"
#include "Export_System.h"
#include "Export_Utility.h"
#include "Player.h"

CWindSlash::CWindSlash(LPDIRECT3DDEVICE9 pGraphicDevice) : Engine::CSkill(pGraphicDevice) {
}

HRESULT CWindSlash::Ready_GameObject() {
FAILED_CHECK_RETURN(Add_Component(), E_FAIL);
m_pTransformCom-&gt;Set_Scale(2.f, 2.f, 1.f);
m_pTransformCom-&gt;Set_Rotation(ROT_X, D3DXToRadian(90.f));
m_tFrame.iFrameStart = 0;
m_tFrame.iFrameEnd = 6;
m_tFrame.fChangeSec = 0.1f;
m_tFrame.fTimeSum = 0.f;
m_bCollision = true;
m_fCooldown = 0.3f;
m_eSkillType = AIR_WIND_SLASH;

	// ������ �Ը� �ۼ�
	m_pTransformCom-&gt;Update_Component(0.f);
	m_pCollider-&gt;Set_Default_Square(m_pTransformCom, 3.0f, 3.0f);

	// ��ų ������ ����
	m_fAttackDelay = 5.f;

	return S_OK;
}

_int CWindSlash::Update_GameObject(const _float&amp; fTimeDelta) {
Move_Frame(fTimeDelta);

	if (m_bDead) { return OBJ_DEAD; }

	if (m_pCollider-&gt;Get_Collision_Count() == 4)
		m_bCollision = false;

	return Engine::CSkill::Update_GameObject(fTimeDelta);
}

void CWindSlash::LateUpdate_GameObject(const _float&amp; fTimeDelta) {
Engine::CSkill::LateUpdate_GameObject(fTimeDelta);
}

void CWindSlash::Render_GameObject() {
m_pGraphicDev-&gt;SetTransform(D3DTS_WORLD, m_pTransformCom-&gt;Get_WorldMatrix());
m_pGraphicDev-&gt;SetRenderState(D3DRS_CULLMODE, D3DCULL_NONE);

	//m_pGraphicDev-&gt;SetTextureStageState(0, D3DTSS_ALPHAOP, D3DTOP_MODULATE);
	//m_pGraphicDev-&gt;SetTextureStageState(0, D3DTSS_ALPHAARG1, D3DTA_TEXTURE);
	//m_pGraphicDev-&gt;SetTextureStageState(0, D3DTSS_ALPHAARG2, D3DTA_TFACTOR);
	//m_pGraphicDev-&gt;SetRenderState(D3DRS_TEXTUREFACTOR, D3DCOLOR_ARGB(100, 255, 255, 255));
	m_pTextureCom[(_int)(m_bRight)]-&gt;Render_Texture(m_tFrame.iFrameStart);
	m_pBufferCom-&gt;Render_Buffer();
	//m_pGraphicDev-&gt;SetTextureStageState(0, D3DTSS_ALPHAOP, D3DTOP_SELECTARG1);

	m_pGraphicDev-&gt;SetRenderState(D3DRS_CULLMODE, D3DCULL_CCW);
}

void CWindSlash::Set_Direction(SkillDir eDir, const _float&amp; fAngle) {
CTransform* pPlayerTransform = dynamic_cast&lt;CTransform*&gt;(Engine::Get_Component(ID_DYNAMIC, L"GameLogic", L"Player", L"Com_Transform"));
_vec3 vPos { 0.f, 0.f, 0.f }, vLook { 0.f, 0.f, 0.f }, vRight { 0.f, 0.f, 0.f };
pPlayerTransform-&gt;Get_Info(INFO_POS, &amp;vPos);
pPlayerTransform-&gt;Get_Info(INFO_LOOK, &amp;vLook);
pPlayerTransform-&gt;Get_Info(INFO_RIGHT, &amp;vRight);
VEC3NORMAL(&amp;vLook);
VEC3NORMAL(&amp;vRight);

	switch (eDir) {
		case SkillDir::LEFT:
			m_pTransformCom-&gt;Rotation(ROT_Y, (fAngle + D3DXToRadian(270.f)));
			vPos -= vRight * 1.5f;
			break;

		case SkillDir::RIGHT:
			m_pTransformCom-&gt;Rotation(ROT_Y, (fAngle + D3DXToRadian(90.f)));
			vPos += vRight * 1.5f;
			break;

		case SkillDir::UP:
			m_pTransformCom-&gt;Rotation(ROT_Y, (fAngle + D3DXToRadian(0.f)));
			vPos += vLook * 1.5f;
			break;

		case SkillDir::DOWN:
			m_pTransformCom-&gt;Rotation(ROT_Y, (fAngle + D3DXToRadian(180.f)));
			vPos -= vLook * 1.5f;
			break;
	}

	m_pTransformCom-&gt;Set_Pos(vPos.x, vPos.y, vPos.z);
	m_pTransformCom-&gt;Update_Component(0.f);

	srand((unsigned)time(NULL));
	m_bRight = (_bool)(rand() % 2);
}

void CWindSlash::Attack_Routine(CUnit* Target)
{
// �ش� ���Ͱ� �����̰� �Կ��� �ִ��� üũ
//if (Is_In_DelayList(Target-&gt;Get_Tag()))
//	return;

	//_vec3 vSkillUp{};
	//m_pTransformCom-&gt;Get_Info(INFO_UP, &amp;vSkillUp);

	//_vec3 vCenterPos{};
	//m_pTransformCom-&gt;Get_Info(INFO_POS, &amp;vCenterPos);
	//Target-&gt;Take_Attack(5, 0.3f, vSkillUp, 1, 50, vCenterPos, PROPERTY::AIR, 0.5f);
	//static_cast&lt;CPlayer*&gt;(Engine::Get_Player())-&gt;Add_Mana();
	//
	//m_DelayList.push_back({ Target-&gt;Get_Tag(), 0.f });
}

CWindSlash* CWindSlash::Create(LPDIRECT3DDEVICE9 pGraphicDevice) {
CWindSlash* pInstance = new CWindSlash(pGraphicDevice);

	if (FAILED(pInstance-&gt;Ready_GameObject())) {
		MSG_BOX("WindSlash Create Failed");
		Engine::Safe_Release(pInstance);
	}

	return pInstance;
}

HRESULT CWindSlash::Add_Component() {
CComponent* pComponent = nullptr;

	pComponent = m_pBufferCom = dynamic_cast&lt;CRcTex*&gt;(Engine::Clone_Proto(L"Proto_RcTex"));
	NULL_CHECK_RETURN(pComponent, E_FAIL);
	m_mapComponent[ID_STATIC].insert({ L"Com_Buffer", pComponent });

	pComponent = m_pTransformCom = dynamic_cast&lt;CTransform*&gt;(Engine::Clone_Proto(L"Proto_Transform"));
	NULL_CHECK_RETURN(pComponent, E_FAIL);
	m_mapComponent[ID_DYNAMIC].insert({ L"Com_Transform", pComponent });

	pComponent = m_pTextureCom[0] = dynamic_cast&lt;CTexture*&gt;(Engine::Clone_Proto(L"Proto_Skill_WindSlash_Left"));
	NULL_CHECK_RETURN(pComponent, E_FAIL);
	m_mapComponent[ID_STATIC].insert({ L"Com_Texture_Left", pComponent });

	pComponent = m_pTextureCom[1] = dynamic_cast&lt;CTexture*&gt;(Engine::Clone_Proto(L"Proto_Skill_WindSlash_Right"));
	NULL_CHECK_RETURN(pComponent, E_FAIL);
	m_mapComponent[ID_STATIC].insert({ L"Com_Texture_Right", pComponent });

	pComponent = m_pCollider = dynamic_cast&lt;CCollider*&gt;(Engine::Clone_Proto(L"Proto_Collider"));
	NULL_CHECK_RETURN(pComponent, E_FAIL);
	m_mapComponent[ID_STATIC].insert({ L"Com_Collider", pComponent });

	return S_OK;
}

void CWindSlash::Move_Frame(const _float&amp; fTimeDelta) {
if (m_tFrame.fChangeSec &lt; m_tFrame.fTimeSum &amp;&amp; m_tFrame.fChangeSec != 0.f) {
++m_tFrame.iFrameStart;
m_tFrame.fTimeSum = 0.f;
}
else { m_tFrame.fTimeSum += fTimeDelta; }

	if (m_tFrame.iFrameStart &gt; m_tFrame.iFrameEnd) { m_bDead = true; }
}

void CWindSlash::Free() {
Engine::CSkill::Free();
}</code></pre>
</details>

## UI - 상태창

상태창은 퀵슬롯·스킬 아이콘·쿨다운·체력/마나 게이지·초상화·코인, 그리고 최종 보스전의 보스 체력·보호막 바를 렌더링합니다.

<details class="code-block">
<summary>Status.h <span class="file-badge">상태창 UI 클래스</span></summary>
<pre markdown="0"><code class="language-cpp">#pragma once
#include "UI.h"

BEGIN(Engine)
class CTestUIBuffer;
class CTransform;
class CTexture;
class CFanBuffer;
END

class CStatus : public CUI
{
private:
explicit CStatus(LPDIRECT3DDEVICE9 pGraphicDev);
virtual ~CStatus() {}

public:
virtual HRESULT			Ready_GameObject();
virtual void			Update_UI(const _float&amp; fTimeDelta) override;
virtual void			Late_Update_UI(const _float&amp; fTimeDelta) override;
virtual void			Render_UI() override;

public:
static CStatus*			Create(LPDIRECT3DDEVICE9 pGraphicDev);

private:
HRESULT					Add_Component();
void					Update_Guage();

private:
virtual void			Free();

private:
// 공통 버퍼
Engine::CTestUIBuffer*	m_pBuffer = nullptr;
Engine::CFanBuffer* m_pFan = nullptr;
// 퀵슬롯
Engine::CTransform*		m_pTransform_QuickSlot = nullptr;
Engine::CTexture*		m_pTexture_QuickSlot = nullptr;
Engine::CTransform*		m_pTransform_Key[5] = {};
Engine::CTexture*		m_pTexture_Key[5] = {};
// 스킬 쿨타임
Engine::CTransform*		m_pTransform_Cooldown[5] = {};
Engine::CTexture*		m_pTexture_Cooldown = nullptr;
// 스킬 아이콘
Engine::CTransform*		m_pTransform_Skill[5] {};
Engine::CTexture*		m_pTexture_Skill = nullptr;
// 게이지 바
Engine::CTransform*		m_pTransform_Gauge[5] {};
Engine::CTexture*		m_pTexture_Gauge[2] {};
// 초상화
Engine::CTransform*		m_pTransform_Portrait = nullptr;
Engine::CTexture*		m_pTexture_Portrait = nullptr;
// 코인
Engine::CTransform*		m_pTransform_Coin[2] {};
Engine::CTexture*		m_pTexture_Coin = nullptr;
// 보스 바
Engine::CTransform*		m_pTransformCom_HpBar[4] {};
Engine::CTexture*		m_pTextureCom_HpBar[4] {};
_float					m_fBackHp = 100.f;
_float					m_fBossBack = 1.f;
};</code></pre>
</details>

`Render_UI`는 퀵슬롯에 장착된 스킬을 순회하며 아이콘을 그리고, 각 슬롯의 쿨다운 비율을 부채꼴 버퍼(`CFanBuffer`)로 시각화합니다.
쿨다운이 도는 동안에는 남은 시간을 숫자로도 표시합니다.
최종 보스전(`SC_BOSS_FINAL`)에서는 보스의 체력 바와 함께, 지연 감소하는 뒷 체력 바(`m_fBossBack`)와 보호막(Shield) 바를 별도로 계산해 겹쳐 그립니다.

<details class="code-block">
<summary>Status.cpp — Render_UI <span class="file-badge">퀵슬롯·쿨다운·보스바 렌더</span></summary>
<pre markdown="0"><code class="language-cpp">void CStatus::Render_UI() {
	if (Engine::Get_Render(CUIMgr::RELIC1) || Engine::Get_Render(CUIMgr::RELIC2) || Engine::Get_Render(CUIMgr::CLOSET))
		return;

	m_pGraphicDev-&gt;SetRenderState(D3DRS_CULLMODE, D3DCULL_NONE);

	// 퀵슬롯 렌더링
	m_pGraphicDev-&gt;SetTransform(D3DTS_WORLD, m_pTransform_QuickSlot-&gt;Get_WorldMatrix());
	m_pTexture_QuickSlot-&gt;Render_Texture(0);
	m_pBuffer-&gt;Render_Buffer();

	// 스킬 아이콘 렌더링
	Engine::SKILL* pSkill = (static_cast&lt;CPlayer*&gt;(Engine::Get_Player()))-&gt;Get_pQuickSlot();

	
	for (int i = 0; i &lt; 5; i++)
	{
		if (pSkill[i] == SKILL_NONE)
			continue;

		m_pGraphicDev-&gt;SetTransform(D3DTS_WORLD, m_pTransform_Key[i]-&gt;Get_WorldMatrix());
		m_pTexture_Key[i]-&gt;Render_Texture(0);
		m_pBuffer-&gt;Render_Buffer();

		m_pGraphicDev-&gt;SetTransform(D3DTS_WORLD, m_pTransform_Skill[i]-&gt;Get_WorldMatrix());
		m_pTexture_Skill-&gt;Render_Texture(pSkill[i]);
		m_pBuffer-&gt;Render_Buffer();

		COOLDOWN tCooldown = static_cast&lt;CPlayer*&gt;(Engine::Get_Player())-&gt;Get_Cooldown((CPlayer::QUICKSLOT)i);

		m_pGraphicDev-&gt;SetTransform(D3DTS_WORLD, m_pTransform_Cooldown[i]-&gt;Get_WorldMatrix());
		m_pTexture_Cooldown-&gt;Render_Texture(0);
		m_pFan-&gt;Render_Buffer(1.f - (tCooldown.fTimeSum / tCooldown.fCooldown));

		if (!(Engine::Get_SceneID() == SC_FINAL_ROOM &amp;&amp; Engine::Get_PrevSceneID() == SC_FINAL_ROOM &amp;&amp; Engine::Get_Render(CUIMgr::FINAL_BOSS)) &amp;&amp;
			!(Engine::Get_SceneID() == SC_BOSS_FINAL &amp;&amp; Engine::Get_Render(CUIMgr::FINAL_BOSS)) &amp;&amp;
			!Engine::Get_Render(CUIMgr::GAMECLEAR) &amp;&amp; !Engine::Get_Render(CUIMgr::FIRE_BOSS) &amp;&amp;
			!Engine::Get_Render(CUIMgr::ICE_BOSS) &amp;&amp;
			!(Engine::Get_SceneID() == SC_ENDING &amp;&amp; Engine::Get_Render(CUIMgr::ENDING_BOSS)) &amp;&amp;
			!(Engine::Get_SceneID() == SC_ENDING &amp;&amp; Engine::Is_ActiveUI()) &amp;&amp;
			!Engine::Get_Render(CUIMgr::SKILL_BOOK2) &amp;&amp; !Engine::Get_Render(CUIMgr::INFO))
		{
			if (tCooldown.fTimeSum &lt; tCooldown.fCooldown) 
			{
				TCHAR pText[256] = L"";
				swprintf_s(pText, 256, L"%.1f", (tCooldown.fCooldown - tCooldown.fTimeSum));
				Engine::Render_Font_Center(L"Font_SoyaPixel", pText, &amp;_vec2((115.f + (i * 99.f)), 1105.f), D3DXCOLOR(1.f, 1.f, 1.f, 1.f));
			}
		}
	}

	// 체력 게이지
	m_pGraphicDev-&gt;SetTransform(D3DTS_WORLD, m_pTransform_Gauge[4]-&gt;Get_WorldMatrix());
	m_pTexture_Gauge[1]-&gt;Render_Texture(1);
	m_pBuffer-&gt;Render_Buffer();

	m_pGraphicDev-&gt;SetTransform(D3DTS_WORLD, m_pTransform_Gauge[1]-&gt;Get_WorldMatrix());
	m_pTexture_Gauge[1]-&gt;Render_Texture(0);
	m_pBuffer-&gt;Render_Buffer();

	// 마나 게이지
	m_pGraphicDev-&gt;SetTransform(D3DTS_WORLD, m_pTransform_Gauge[2]-&gt;Get_WorldMatrix());
	m_pTexture_Gauge[1]-&gt;Render_Texture(2);
	m_pBuffer-&gt;Render_Buffer();

	// 게이지 렌더링
	m_pGraphicDev-&gt;SetTransform(D3DTS_WORLD, m_pTransform_Gauge[0]-&gt;Get_WorldMatrix());
	m_pTexture_Gauge[0]-&gt;Render_Texture(0);
	m_pBuffer-&gt;Render_Buffer();

	// 초상화 렌더링
	m_pGraphicDev-&gt;SetTransform(D3DTS_WORLD, m_pTransform_Portrait-&gt;Get_WorldMatrix());
	m_pTexture_Portrait-&gt;Render_Texture(static_cast&lt;CPlayer*&gt;(Engine::Get_Player())-&gt;Get_Hood());
	m_pBuffer-&gt;Render_Buffer();

	TCHAR pText[256] = L"";
	CPlayer* pPlayer = static_cast&lt;CPlayer*&gt;(Engine::Get_Player());

	// 체력 텍스트
	if (!Engine::Get_Render(CUIMgr::SKILL_BOOK2) &amp;&amp; !Engine::Get_Render(CUIMgr::INFO) &amp;&amp; !Engine::Get_Render(CUIMgr::GAMECLEAR) &amp;&amp; !(Engine::Get_SceneID() == SC_ENDING &amp;&amp; !Engine::Get_Render(CUIMgr::ENDING_BOSS) &amp;&amp; Engine::Is_ActiveUI())) {
		swprintf_s(pText, 256, L"%d/%d", pPlayer-&gt;Get_CurHealth(), pPlayer-&gt;Get_MaxHealth());
		m_pGraphicDev-&gt;SetTransform(D3DTS_WORLD, m_pTransform_Gauge[3]-&gt;Get_WorldMatrix());
		Engine::Render_Font_Center(L"Font_SoyaPixel", pText, &amp;_vec2(320.f - 2.f, 55.f), D3DXCOLOR(0.f, 0.f, 0.f, 1.f));
		Engine::Render_Font_Center(L"Font_SoyaPixel", pText, &amp;_vec2(320.f + 2.f, 55.f), D3DXCOLOR(0.f, 0.f, 0.f, 1.f));
		Engine::Render_Font_Center(L"Font_SoyaPixel", pText, &amp;_vec2(320.f, 55.f - 2.f), D3DXCOLOR(0.f, 0.f, 0.f, 1.f));
		Engine::Render_Font_Center(L"Font_SoyaPixel", pText, &amp;_vec2(320.f, 55.f + 2.f), D3DXCOLOR(0.f, 0.f, 0.f, 1.f));
		Engine::Render_Font_Center(L"Font_SoyaPixel", pText, &amp;_vec2(320.f, 55.f), D3DXCOLOR(1.f, 1.f, 1.f, 1.f));
	}

	// 코인 렌더링
	m_pGraphicDev-&gt;SetTransform(D3DTS_WORLD, m_pTransform_Coin[0]-&gt;Get_WorldMatrix());
	m_pTexture_Coin-&gt;Render_Texture(0);
	m_pBuffer-&gt;Render_Buffer();

	// 코인 텍스트
	if (!Engine::Get_Render(CUIMgr::SKILL_BOOK2) &amp;&amp; !Engine::Get_Render(CUIMgr::INFO) &amp;&amp; !((Engine::Get_SceneID() == SC_FINAL_ROOM || Engine::Get_SceneID() == SC_BOSS_FINAL) &amp;&amp; Engine::Get_Render(CUIMgr::FINAL_BOSS)) &amp;&amp; !Engine::Get_Render(CUIMgr::GAMECLEAR) &amp;&amp; 
		!Engine::Get_Render(CUIMgr::FIRE_BOSS) &amp;&amp; !Engine::Get_Render(CUIMgr::ICE_BOSS) &amp;&amp; !(Engine::Get_SceneID() == SC_ENDING &amp;&amp; Engine::Get_Render(CUIMgr::ENDING_BOSS)) &amp;&amp; !(Engine::Get_SceneID() == SC_ENDING &amp;&amp; Engine::Is_ActiveUI())) {
		swprintf_s(pText, 256, L"%d", pPlayer-&gt;Get_Money());
		m_pGraphicDev-&gt;SetTransform(D3DTS_WORLD, m_pTransform_Coin[1]-&gt;Get_WorldMatrix());
		Engine::Render_Font(L"Font_SoyaPixel_Large", pText, &amp;_vec2(420.f - 1.f, 544.f), D3DXCOLOR(0.f, 0.f, 0.f, 1.f));
		Engine::Render_Font(L"Font_SoyaPixel_Large", pText, &amp;_vec2(420.f + 1.f, 544.f), D3DXCOLOR(0.f, 0.f, 0.f, 1.f));
		Engine::Render_Font(L"Font_SoyaPixel_Large", pText, &amp;_vec2(420.f, 544.f - 1.f), D3DXCOLOR(0.f, 0.f, 0.f, 1.f));
		Engine::Render_Font(L"Font_SoyaPixel_Large", pText, &amp;_vec2(420.f, 544.f + 1.f), D3DXCOLOR(0.f, 0.f, 0.f, 1.f));
		Engine::Render_Font(L"Font_SoyaPixel_Large", pText, &amp;_vec2(420.f, 544.f), D3DXCOLOR(1.f, 1.f, 1.f, 1.f));
	}

	// SceneID 와 PrevSceneID가 같으면 씬 이동이 완전히 끝난 상태
	if (Engine::Get_SceneID() == SC_BOSS_FINAL &amp;&amp; Engine::Get_PrevSceneID() == SC_BOSS_FINAL) {
		if (static_cast&lt;CFinalBoss*&gt;(Engine::Get_Scene())-&gt;Get_Boss()) {
			// HpBar BackGround
			m_pGraphicDev-&gt;SetTransform(D3DTS_WORLD, m_pTransformCom_HpBar[0]-&gt;Get_WorldMatrix());
			m_pTextureCom_HpBar[0]-&gt;Render_Texture(0);
			m_pBuffer-&gt;Render_Buffer();

			// Hp Back 비율 계산
			m_pTransformCom_HpBar[3]-&gt;Set_Scale((204.f * m_fBossBack), 16.f, 1.f);
			m_pTransformCom_HpBar[3]-&gt;Set_Pos((-102.f + (102.f * m_fBossBack)), 248.f, 0.009f);
			m_pTransformCom_HpBar[3]-&gt;Update_Component(0.f);

			// Hp Back
			m_pGraphicDev-&gt;SetTransform(D3DTS_WORLD, m_pTransformCom_HpBar[3]-&gt;Get_WorldMatrix());
			m_pTextureCom_HpBar[3]-&gt;Render_Texture(0);
			m_pBuffer-&gt;Render_Buffer();

			// Hp Guage 비율 계산
			_float fPercent = static_cast&lt;CFinalBoss*&gt;(Engine::Get_Scene())-&gt;Get_Boss()-&gt;Get_CurHealth() / (_float)(static_cast&lt;CFinalBoss*&gt;(Engine::Get_Scene())-&gt;Get_Boss()-&gt;Get_MaxHealth());

			// 비율에 따른 위치값과 가로 길이 설정
			m_pTransformCom_HpBar[1]-&gt;Set_Scale((204.f * fPercent), 16.f, 1.f);
			m_pTransformCom_HpBar[1]-&gt;Set_Pos((-102.f + (102.f * fPercent)), 248.f, 0.009f);
			m_pTransformCom_HpBar[1]-&gt;Update_Component(0.f);

			// Hp Guage
			m_pGraphicDev-&gt;SetTransform(D3DTS_WORLD, m_pTransformCom_HpBar[1]-&gt;Get_WorldMatrix());
			m_pTextureCom_HpBar[1]-&gt;Render_Texture(0);
			m_pBuffer-&gt;Render_Buffer();
			
			// Shield Guage 비율 계산
			fPercent = static_cast&lt;CMasterSura*&gt;(static_cast&lt;CFinalBoss*&gt;(Engine::Get_Scene())-&gt;Get_Boss())-&gt;Get_Shield() / (_float)(static_cast&lt;CMasterSura*&gt;(static_cast&lt;CFinalBoss*&gt;(Engine::Get_Scene())-&gt;Get_Boss())-&gt;Get_MaxShield());

			if (fPercent &gt; 0.f) {
				// 비율에 따른 위치값과 가로 길이 설정
				m_pTransformCom_HpBar[2]-&gt;Set_Scale((204.f * fPercent), 16.f, 1.f);
				m_pTransformCom_HpBar[2]-&gt;Set_Pos((-102.f + (102.f * fPercent)), 248.f, 0.009f);
				m_pTransformCom_HpBar[2]-&gt;Update_Component(0.f);

				// Shield Guage Render
				m_pGraphicDev-&gt;SetTransform(D3DTS_WORLD, m_pTransformCom_HpBar[2]-&gt;Get_WorldMatrix());
				m_pTextureCom_HpBar[2]-&gt;Render_Texture(0);
				m_pBuffer-&gt;Render_Buffer();
			}

			// 몬스터 이름 출력
			m_pGraphicDev-&gt;SetTransform(D3DTS_WORLD, m_pTransform_Coin[1]-&gt;Get_WorldMatrix());
			Engine::Render_Font_Center(L"Font_Lato", L"마스터 수라", &amp;_vec2(800.f, 60.f), D3DXCOLOR(1.f, 1.f, 1.f, 1.f));
		}
	}

	m_pGraphicDev-&gt;SetRenderState(D3DRS_CULLMODE, D3DCULL_CCW);
}</code></pre>
</details>

`Update_Guage`는 체력·마나 게이지의 스케일과 위치를 실시간 비율로 갱신합니다.
플레이어 체력이 감소하면 실제 체력 바는 즉시 줄지만, 뒷 체력 바(`m_fBackHp`)는 감소 폭에 따라 단계적으로 천천히 따라오도록 하여 피격 연출을 강조합니다.
보스 체력 바에도 동일한 지연 감소 로직을 적용합니다.

<details class="code-block">
<summary>Status.cpp — Update_Guage <span class="file-badge">게이지 비율·지연 감소</span></summary>
<pre markdown="0"><code class="language-cpp">void CStatus::Update_Guage() {
	_vec3 vPos { 0.f, 0.f, 0.f }, vSize { 0.f, 0.f, 0.f };

	_int iMaxHp = static_cast&lt;CPlayer*&gt;(Engine::Get_Player())-&gt;Get_MaxHealth();
	_int iCurHp = static_cast&lt;CPlayer*&gt;(Engine::Get_Player())-&gt;Get_CurHealth();
	_float fHpPercent = (_float)iCurHp / (_float)iMaxHp;

	m_pTransform_Gauge[1]-&gt;Set_Scale((148.f * fHpPercent), 20.f, 0.f);
	vPos = Engine::CPipeline::Calc_PhotoShop_To_Pos((148.f * fHpPercent), 20.f, 79.f, 26.f);
	m_pTransform_Gauge[1]-&gt;Set_Pos(vPos.x, vPos.y, 0.089f);

	_float fBackHpPercent = m_fBackHp * 0.01f;

	if (fBackHpPercent &gt; fHpPercent) {
		if (fBackHpPercent - fHpPercent &gt;= 0.05f) {
			if (fBackHpPercent - fHpPercent &gt;= 0.1f) {
				if (fBackHpPercent - fHpPercent &gt;= 0.2f) {
					if (fBackHpPercent - fHpPercent &gt;= 0.4f) {
						m_fBackHp -= 1.f;
					}
					else { m_fBackHp -= 0.8f; }
				}
				else { m_fBackHp -= 0.4f; }
			}
			else { m_fBackHp -= 0.2f; }
		}
		else { m_fBackHp -= 0.1f; }
	}
	else if (fBackHpPercent &lt; fHpPercent) { m_fBackHp = fHpPercent * 100.f; }


	// BossHp
	if (Engine::Get_SceneID() == SC_BOSS_FINAL &amp;&amp; Engine::Get_PrevSceneID() == SC_BOSS_FINAL) {
		if (static_cast&lt;CFinalBoss*&gt;(Engine::Get_Scene())-&gt;Get_Boss()) {
			_float fPercent = static_cast&lt;CFinalBoss*&gt;(Engine::Get_Scene())-&gt;Get_Boss()-&gt;Get_CurHealth() / (_float)(static_cast&lt;CFinalBoss*&gt;(Engine::Get_Scene())-&gt;Get_Boss()-&gt;Get_MaxHealth());

			if (m_fBossBack &gt; fPercent) {
				if (m_fBossBack - fPercent &gt;= 0.05f) {
					if (m_fBossBack - fPercent &gt;= 0.1f) {
						if (m_fBossBack - fPercent &gt;= 0.2f) {
							if (m_fBossBack - fPercent &gt;= 0.4f) { m_fBossBack -= 0.008f; }
							else { m_fBossBack -= 0.004f; }
						}
						else { m_fBossBack -= 0.002f; }
					}
					else { m_fBossBack -= 0.001f; }
				}
				else { m_fBossBack -= 0.0005f; }
			}
			else if (m_fBossBack &lt; fPercent) { m_fBossBack = fPercent; }
		}
	}

	m_pTransform_Gauge[4]-&gt;Set_Scale((148.f * fBackHpPercent), 20.f, 0.f);
	vPos = Engine::CPipeline::Calc_PhotoShop_To_Pos((148.f * fBackHpPercent), 20.f, 79.f, 26.f);
	m_pTransform_Gauge[4]-&gt;Set_Pos(vPos.x, vPos.y, 0.089f);

	// Mana
	_int iMaxMana = static_cast&lt;CPlayer*&gt;(Engine::Get_Player())-&gt;Get_MaxMana();
	_int iCurMana = static_cast&lt;CPlayer*&gt;(Engine::Get_Player())-&gt;Get_CurMana();
	_float fManaPercent = (_float)iCurMana / (_float)iMaxMana;

	m_pTransform_Gauge[2]-&gt;Set_Scale((117.f * fManaPercent), 10.f, 0.f);
	vPos = Engine::CPipeline::Calc_PhotoShop_To_Pos((117.f * fManaPercent), 10.f, 80.f, 52.f);
	m_pTransform_Gauge[2]-&gt;Set_Pos(vPos.x, vPos.y, 0.089f);

	m_pTransform_Gauge[1]-&gt;Update_Component(0.f);
	m_pTransform_Gauge[2]-&gt;Update_Component(0.f);
	m_pTransform_Gauge[4]-&gt;Update_Component(0.f);
}</code></pre>
</details>

## 최종 보스 - Master Sura

최종 보스 Master Sura는 골렘을 부리는 0페이즈와, 후드를 벗고 직접 싸우는 1페이즈로 나뉩니다.
각 페이즈는 패턴 목록을 벡터로 관리하고, 목록을 무작위로 섞어(`Swap_Phase*_Pattern`) 순서대로 시전하는 방식입니다.
피격 시 체력 대신 보호막(Shield)을 먼저 소모하고, 패턴을 쓸 때마다 체력 비례로 보호막을 회복(`AddShieldFromHealthPercentage`)해 지구전을 유도합니다.

<details class="code-block">
<summary>MasterSura.h <span class="file-badge">최종 보스 클래스 구조</span></summary>
<pre markdown="0"><code class="language-cpp">#pragma once
#include "Unit.h"

class CMasterSura : public Engine::CUnit {
public:
enum GOLEMMOTION { GOLEM_BEGIN = -1, GOLEM_IDLE, GOLEM_PILLAR, GOLEM_ORB, GOLEM_COIL, GOLEM_BEAM, GOLEM_BALL, GOLEM_END };
enum HOOD { HOOD_BEGIN = -1, HOOD_ENABLE, HOOD_DISABLE, HOOD_END };
enum MOTION { MOTION_BEGIN = -1, MOTION_IDLE, MOTION_HOOD, MOTION_BOMBING, MOTION_SHOCKNOVA, MOTION_LASER, MOTION_METEOR,
MOTION_UP, MOTION_DOWN, MOTION_LEFT, MOTION_RIGHT, MOTION_SMASH,
MOTION_DASH_UP, MOTION_DASH_DOWN, MOTION_DASH_LEFT, MOTION_DASH_RIGHT,
MOTION_DEAD, MOTION_END };

private:
explicit CMasterSura(LPDIRECT3DDEVICE9 pGraphicDevice);
virtual ~CMasterSura() {}

public:
virtual HRESULT			Ready_GameObject();
virtual _int			Update_GameObject(const _float&amp; fTimeDelta);
virtual void			LateUpdate_GameObject(const _float&amp; fTimeDelta);
virtual void			Render_GameObject();
virtual CTransform*		Get_Transform_Component() { return m_pTransformCom; }

public:
static CMasterSura*		Create(LPDIRECT3DDEVICE9 pGraphicDev);

public:
_int					Get_MaxShield() { return m_iMaxShield; }
_int					Get_Shield() { return m_iShield; }

public:
void					Set_Shield(const _int&amp; iShield) { m_iMaxShield = iShield; m_iShield = iShield; }
void					Add_Shield(const _uint&amp; iShield) { m_iMaxShield += iShield; m_iShield += iShield; }
void					AddShieldFromHealthPercentage(const _float&amp; iPercent) { m_iMaxShield += (_int)(m_iMaxHp * (iPercent * 0.01f)); m_iShield += (_int)(m_iMaxHp * (iPercent * 0.01f)); }
void					Next_Phase();

private:
HRESULT					Add_Component();
HRESULT					Setting_Default();
void					Move_Frame(const _float&amp; fTimeDelta);
void					Change_State();
void					Change_Golem();
void					Move_Golem(const _float&amp; fTimeDelta);
_int					Check_Phase();
void					Phase_Pattern(const _float&amp; fTimeDelta);
void					Check_Smash();
void					Debug_Key();
void					Calc_Distance();
void					Dash(const _float&amp; fTimeDelta);

private:
void					Swap_Phase0_Pattern();
void					Swap_Phase1_Pattern();
void					Pattern_Bombing();
void					Pattern_MortalCoil();
void					Pattern_ShockNova();
void					Pattern_Laser();
void					Pattern_MiniLaser();
void					Pattern_RockSmash();
void					Pattern_Dash();
void					Make_Meteor(const _float&amp; fTimeDelta);

private:
virtual void			Free();
virtual void			After_Hit(const _bool&amp; isCri, const _int&amp; Damage, const DAMAGETYPE&amp; damagetype, const _vec3&amp; vInverseDir);

private:
Engine::CTexture*		m_pTextureCom[HOOD_END][MOTION_END] = {};
Engine::CTexture*		m_pTextureCom_Golem[GOLEM_END] = {};
Engine::CTransform*		m_pTransformCom_Golem = nullptr;

	GOLEMMOTION				m_ePrevGolemMotion = GOLEM_IDLE;
	GOLEMMOTION				m_eGolemMotion = GOLEM_IDLE;
	MOTION					m_ePrevMotion = MOTION_IDLE;
	MOTION					m_eMotion = MOTION_IDLE;
	HOOD					m_eHood = HOOD_DISABLE;

	FRAME					m_tFrame[2] = {};

	_bool					m_bPattern_Golem[GOLEM_END] = {};
	_bool					m_bPattern[MOTION_END] = {};
	_bool					m_bNextPhase = false;
	_bool					m_bPhase0 = false;
	_bool					m_bPhase1 = false;
	_bool					m_bPhase0_UI = false;
	_bool					m_bGolem = true;
	_bool					m_bSmash = false;
	_bool					m_bDash = false;

	_float					m_fDistance = 0.f;
	_float					m_fMakeMeteorTimer = 0.f;

	_int					m_iNowMeteorNumber = 0;
	_int					m_iMaxShield = 0;
	_int					m_iShield = 0;
	_int					m_iCurPhase = 0;
	_int					m_iSmash = 0;
	_int					m_iDashMax = 0;
	_int					m_iDashCnt = 0;

	_vec3					m_vDash = { 0.f, 0.f, 0.f };

	FRAME					m_tPatternFrame = { 0, 0, 0.f, 0.f };

	vector&lt;GOLEMMOTION&gt;		m_vecGolemMotion;
	vector&lt;MOTION&gt;			m_vecMotion;
};</code></pre>
</details>

`Update_GameObject`가 매 프레임 페이즈 전환 검사(`Check_Phase`), 골렘 이동, 패턴 진행(`Phase_Pattern`), 대시·강타·메테오 처리를 순서대로 호출합니다.
`Check_Phase`는 0페이즈 종료 시 후드 모션으로, 1페이즈 종료 시 사망 모션으로 전환합니다.
`Phase_Pattern`은 현재 페이즈에 따라 골렘 모션 목록 또는 보스 본체 모션 목록을 타이머 기반으로 하나씩 꺼내 시전하고, 목록을 다 쓰면 다시 섞습니다.
`Pattern_Bombing`은 페이즈별로 폭격 패턴을 다르게 전개합니다 — 0페이즈는 플레이어 방향으로 한 줄, 1페이즈는 세 줄을 시간차를 두고 깔아 회피 난이도를 높입니다.

<details class="code-block">
<summary>MasterSura.cpp — Update / Check_Phase / Phase_Pattern / Pattern_Bombing <span class="file-badge">페이즈 전환·패턴 시전</span></summary>
<pre markdown="0"><code class="language-cpp">_int CMasterSura::Update_GameObject(const _float&amp; fTimeDelta) {
	if (Check_Phase()) { Engine::Active_UI(CUIMgr::GAMECLEAR); return OBJ_DEAD; }

	Engine::Add_RenderGroup(RENDER_ALPHA, this);

	if (m_bGolem) { m_pCollider-&gt;Set_Default_Unit(m_pTransformCom, 4.f); }
	else { m_pCollider-&gt;Set_Default_Unit(m_pTransformCom, 2.f); }

	m_pTransformCom-&gt;Rotation_To_Player();
	m_pTransformCom_Golem-&gt;Rotation_To_Player();
	m_pTransformCom-&gt;Get_Info(INFO_POS, &amp;m_vPrePosition);

	Move_Golem(fTimeDelta);
	Debug_Key();
	Phase_Pattern(fTimeDelta);
	Check_Smash();
	Dash(fTimeDelta);
	Check_Skill_Timer(fTimeDelta);
	Make_Meteor(fTimeDelta);

	return Engine::CUnit::Update_GameObject(fTimeDelta);
}

_int CMasterSura::Check_Phase() {
if (!m_bNextPhase) { return OBJ_NOEVENT; }

	if (m_bPhase0) {
		m_bPhase0 = false;
		m_eMotion = MOTION_HOOD;
	}
	else if (m_bPhase1) {
		m_bPhase1 = false;
		m_eMotion = MOTION_DEAD;
	}

	if (m_eHood == HOOD_ENABLE &amp;&amp; m_eMotion == MOTION_DEAD &amp;&amp; m_tFrame[0].fChangeSec &gt;= m_tFrame[0].fTimeSum &amp;&amp; m_tFrame[0].iFrameStart == m_tFrame[0].iFrameEnd) {
		static_cast&lt;CFinalBoss*&gt;(Engine::Get_Scene())-&gt;Null_Boss();
		CSoundMgr::GetInstance()-&gt;StopSound(SOUND_BGM2);
		return OBJ_DEAD;
	}

	return OBJ_NOEVENT;
}

void CMasterSura::Phase_Pattern(const _float&amp; fTimeDelta) {
if (m_eMotion == MOTION_HOOD || m_eMotion == MOTION_DEAD) { return; }

	if (m_iCurPhase == 0) {
		if (m_eGolemMotion == GOLEM_IDLE) { m_tPatternFrame.fTimeSum += fTimeDelta; }

		if (m_tPatternFrame.fTimeSum &gt;= m_tPatternFrame.fChangeSec) {
			m_tPatternFrame.fTimeSum = 0.f;
			m_eGolemMotion = m_vecGolemMotion[m_tPatternFrame.iFrameStart];
			++(m_tPatternFrame.iFrameStart);
		}

		if (m_tPatternFrame.iFrameStart &gt; m_tPatternFrame.iFrameEnd) {
			m_tPatternFrame.iFrameStart = 0;
			Swap_Phase0_Pattern();
		}
	}
	else if (m_iCurPhase == 1) {
		if (m_eMotion == MOTION_IDLE) { m_tPatternFrame.fTimeSum += fTimeDelta; if (m_iDashCnt &lt; m_iDashMax) { Pattern_Dash(); } }

		if (m_tPatternFrame.fTimeSum &gt;= m_tPatternFrame.fChangeSec &amp;&amp; m_iDashCnt == m_iDashMax) {
			m_tPatternFrame.fTimeSum = 0.f;
			m_eMotion = m_vecMotion[m_tPatternFrame.iFrameStart];
			++(m_tPatternFrame.iFrameStart);
			m_iDashCnt = 0;
			m_iDashMax = rand() % 3;
		}

		if (m_tPatternFrame.iFrameStart &gt; m_tPatternFrame.iFrameEnd) {
			m_tPatternFrame.iFrameStart = 0;
			Swap_Phase1_Pattern();
		}
		// �Ÿ��� 20 �̻��� ��� : Dash
		// �Ÿ��� 15 �̻��� ��� : Dash, RockSmash, Bombing, MiniLaser
		// �Ÿ��� 10 �̻��� ��� : Dash, RockSmash, Bombing, MiniLaser
		// �Ÿ���  5 �̻��� ��� : ShockNova, ???
		// �Ÿ���  5 �̸��� ��� : Back Dash, ShockNova
	}
}

void CMasterSura::Pattern_Bombing() {
_vec3 vPos { 0.f, 0.f, 0.f }, vLook { 0.f, 0.f, 1.f }, vTarget { 0.f, 0.f, 0.f }, vPos2 { 0.f, 0.f, 0.f }, vPos3 { 0.f, 0.f, 0.f }, vRight { 1.f, 0.f, 0.f };
m_pTransformCom-&gt;Get_Info(INFO_POS, &amp;vPos);
Engine::Get_Player()-&gt;Get_Transform_Component()-&gt;Get_Info(INFO_POS, &amp;vTarget);

	VEC3NORMAL(&amp;vLook);
	VEC3NORMAL(&amp;vRight);

	_float fAngle(0.f);
	POINT ptBoss { (_long)vPos.x, (_long)vPos.z }, ptPlayer { (_long)vTarget.x, (_long)vTarget.z };
	fAngle = Engine::CPipeline::Calc_Point_Angle(ptPlayer, ptBoss);

	_matrix matRot {};
	D3DXMatrixRotationY(&amp;matRot, -fAngle);
	D3DXVec3TransformNormal(&amp;vLook, &amp;vLook, &amp;matRot);
	D3DXVec3TransformNormal(&amp;vRight, &amp;vRight, &amp;matRot);

	CSkill* pSkill = nullptr;

	if (m_iCurPhase == 0) {
		pSkill = CBombing::Create(m_pGraphicDev);
		NULL_CHECK_RETURN(pSkill, );
		static_cast&lt;CBombing*&gt;(pSkill)-&gt;Set_Pos(vPos.x, 0.01f, vPos.z);
		static_cast&lt;CBombing*&gt;(pSkill)-&gt;Set_StartTime(0.f);
		Engine::Add_MonsterSkill(pSkill);

		for (_uint i = 0; i &lt; 13; ++i) {
			vPos += vLook * 4.f;

			pSkill = CBombing::Create(m_pGraphicDev);
			NULL_CHECK_RETURN(pSkill, );
			static_cast&lt;CBombing*&gt;(pSkill)-&gt;Set_Pos(vPos.x, 0.01f, vPos.z);
			static_cast&lt;CBombing*&gt;(pSkill)-&gt;Set_StartTime(0.1f * (i + 1));
			Engine::Add_MonsterSkill(pSkill);
		}
	}
	else if (m_iCurPhase == 1) {
		vPos -= (vLook * 48.f);
		vPos2 = vPos + (vRight * 4.f);
		vPos3 = vPos - (vRight * 4.f);

		pSkill = CBombing::Create(m_pGraphicDev);
		NULL_CHECK_RETURN(pSkill, );
		static_cast&lt;CBombing*&gt;(pSkill)-&gt;Set_Pos(vPos.x, 0.01f, vPos.z);
		static_cast&lt;CBombing*&gt;(pSkill)-&gt;Set_StartTime(0.f);
		Engine::Add_MonsterSkill(pSkill);

		pSkill = CBombing::Create(m_pGraphicDev);
		NULL_CHECK_RETURN(pSkill, );
		static_cast&lt;CBombing*&gt;(pSkill)-&gt;Set_Pos(vPos2.x, 0.01f, vPos2.z);
		static_cast&lt;CBombing*&gt;(pSkill)-&gt;Set_StartTime(0.f);
		Engine::Add_MonsterSkill(pSkill);

		pSkill = CBombing::Create(m_pGraphicDev);
		NULL_CHECK_RETURN(pSkill, );
		static_cast&lt;CBombing*&gt;(pSkill)-&gt;Set_Pos(vPos3.x, 0.01f, vPos3.z);
		static_cast&lt;CBombing*&gt;(pSkill)-&gt;Set_StartTime(0.f);
		Engine::Add_MonsterSkill(pSkill);

		for (_uint i = 0; i &lt; 24; ++i) {
			vPos += vLook * 4.f;
			vPos2 += vLook * 4.f;
			vPos3 += vLook * 4.f;

			pSkill = CBombing::Create(m_pGraphicDev);
			NULL_CHECK_RETURN(pSkill, );
			static_cast&lt;CBombing*&gt;(pSkill)-&gt;Set_Pos(vPos.x, 0.01f, vPos.z);
			static_cast&lt;CBombing*&gt;(pSkill)-&gt;Set_StartTime(0.05f * (i + 1));
			Engine::Add_MonsterSkill(pSkill);

			pSkill = CBombing::Create(m_pGraphicDev);
			NULL_CHECK_RETURN(pSkill, );
			static_cast&lt;CBombing*&gt;(pSkill)-&gt;Set_Pos(vPos2.x, 0.01f, vPos2.z);
			static_cast&lt;CBombing*&gt;(pSkill)-&gt;Set_StartTime(0.05f * (i + 1));
			Engine::Add_MonsterSkill(pSkill);

			pSkill = CBombing::Create(m_pGraphicDev);
			NULL_CHECK_RETURN(pSkill, );
			static_cast&lt;CBombing*&gt;(pSkill)-&gt;Set_Pos(vPos3.x, 0.01f, vPos3.z);
			static_cast&lt;CBombing*&gt;(pSkill)-&gt;Set_StartTime(0.05f * (i + 1));
			Engine::Add_MonsterSkill(pSkill);
		}
	}

	AddShieldFromHealthPercentage(10.f);
}</code></pre>
</details>