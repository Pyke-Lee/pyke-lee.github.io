---
layout: project
title: Tribes of Midgard 모작 (DirectX11)
subtitle: DirectX11 프레임워크 기반 탑다운 로그라이크
youtube_id: TwHdZhRl3bs
period: 2024.09 ~ 2024.11 (약 3개월)
team: 1인 개발
role: 전체 (엔진 프레임워크, 클라이언트 로직, 셰이더 등)
tech: [C++, DirectX11, FMOD, HLSL]
github: https://github.com/Pyke-Lee/Personal-Portfolio
---

## 프로젝트 개요

Tribes of Midgard를 모티브로 한 탑다운 로그라이크 액션 게임입니다.
상용 엔진 없이 DirectX11을 직접 다루는 자체 프레임워크를 구축하고, 그 위에 게임 로직을 얹는 것을 목표로 했습니다.
프로젝트는 크게 재사용 가능한 **Engine 정적 라이브러리**와 실제 게임을 구현한 **Client**로 분리되어 있습니다.

## 아키텍처

엔진은 레벨(Level) → 레이어(Layer) → 게임오브젝트(GameObject) → 컴포넌트(Component)로 이어지는 계층 구조를 가집니다.

- **GameInstance** — 엔진의 모든 매니저에 접근하는 단일 진입점(퍼사드)
- **GameObject_Manager** — 프로토타입 등록·복제, 레이어별 오브젝트 관리 및 갱신
- **Component_Manager** — 레벨 단위로 컴포넌트 프로토타입을 보관·복제
- **Renderer** — 렌더 그룹별로 오브젝트를 모아 디퍼드 렌더링 파이프라인 실행
- **Input_Device** — DirectInput 기반 키보드·마우스 상태 관리

모든 엔진 객체는 참조 카운팅 기반 `CBase`를 상속받아 `Safe_AddRef` / `Safe_Release`로 수명을 관리합니다.

## 엔진 프레임워크

### 게임오브젝트 기반 구조

모든 게임 오브젝트는 추상 클래스 `CGameObject`를 상속받습니다.
`CGameObject`는 Transform 컴포넌트를 기본으로 보유하고, `m_Components` 맵으로 추가 컴포넌트(Shader, Model, Collider 등)를 이름 기반으로 관리합니다.
`Clone`을 순수 가상 함수로 두어, 프로토타입 인스턴스를 복제하는 방식으로 실제 오브젝트를 생성합니다.

<details class="code-block">
<summary>GameObject.h <span class="file-badge">게임오브젝트 기반 클래스</span></summary>
<pre markdown="0"><code class="language-cpp">#pragma once
#include "Transform.h"
#include "Renderer.h"

BEGIN(Engine)

class ENGINE_DLL CGameObject abstract : public CBase {
public:
struct GAMEOBJECT_DESC {
_float fCullingRange = { 1.f };
};

protected:
explicit CGameObject(ID3D11Device* pDevice, ID3D11DeviceContext* pContext);
explicit CGameObject(const CGameObject&amp; rhs);
virtual ~CGameObject() = default;

public:
class CTransform*							Get_Transform() { return m_pTransformCom; }

public:
virtual void								Set_Dead(const _bool&amp; bDead) { m_bDead = bDead; }

public:
virtual _bool								IsDead() { return m_bDead; }
virtual class CComponent*					Find_Component(const _wstring&amp; strComponentTag, _int iPartObjID = -1);

public:
virtual HRESULT								Priority_Update_GameObject(const _float&amp; fTimeDelta);
virtual HRESULT								Update_GameObject(const _float&amp; fTimeDelta);
virtual HRESULT								Late_Update_GameObject(const _float&amp; fTimeDelta);
virtual HRESULT								Render_GameObject();
virtual HRESULT								Render_GameObject_Height() { return S_OK; }
virtual HRESULT								Render_GameObject_Shadow() { return S_OK; }

public:
virtual CGameObject*						Clone(void* pArg) PURE;
virtual void								Free() override;

protected:
virtual HRESULT								Initialize_Prototype();
virtual HRESULT								Initialize_GameObject(void* pArg);

protected:
HRESULT										Add_Component(_uint iLevelIndex, const _wstring&amp; strProtoTag, const _wstring&amp; strComponentTag, class CComponent** ppOut, void* pArg = nullptr);

protected:
ID3D11Device*								m_pDevice = { nullptr };
ID3D11DeviceContext*						m_pContext = { nullptr };

	class CGameInstance*						m_pGameInstance = { nullptr };
	class CTransform*							m_pTransformCom = { nullptr };

	map&lt;const _wstring, class CComponent*&gt;		m_Components;

	CRenderer::RENDERGROUP						m_eRenderGroup = { CRenderer::RENDER_END };

	_bool										m_bDead = { false };

	_float										m_fCullingRange = { 1.f };
};

END</code></pre>
</details>

`Add_Component`는 GameInstance를 통해 컴포넌트 프로토타입을 복제해 받아온 뒤, 중복 태그가 없으면 `m_Components`에 등록하고 참조 카운트를 올립니다.
`Free`에서는 보유한 모든 컴포넌트를 `Safe_Release`로 해제하여 메모리 누수를 방지합니다.

<details class="code-block">
<summary>GameObject.cpp <span class="file-badge">컴포넌트 관리 구현</span></summary>
<pre markdown="0"><code class="language-cpp">#include "GameObject.h"
#include "GameInstance.h"

CGameObject::CGameObject(ID3D11Device* pDevice, ID3D11DeviceContext* pContext) {
m_pDevice = pDevice;
Safe_AddRef(m_pDevice);

	m_pContext = pContext;
	Safe_AddRef(m_pContext);

	m_pGameInstance = CGameInstance::Get_Instance();
	Safe_AddRef(m_pGameInstance);
}

CGameObject::CGameObject(const CGameObject&amp; rhs) {
m_pDevice = rhs.m_pDevice;
Safe_AddRef(m_pDevice);

	m_pContext = rhs.m_pContext;
	Safe_AddRef(m_pContext);

	m_pGameInstance = rhs.m_pGameInstance;
	Safe_AddRef(m_pGameInstance);

	m_fCullingRange = rhs.m_fCullingRange;
}

HRESULT CGameObject::Priority_Update_GameObject(const _float&amp; fTimeDelta) {
return S_OK;
}

HRESULT CGameObject::Update_GameObject(const _float&amp; fTimeDelta) {
return S_OK;
}

HRESULT CGameObject::Late_Update_GameObject(const _float&amp; fTimeDelta) {
return S_OK;
}

HRESULT CGameObject::Render_GameObject() {
return S_OK;
}

void CGameObject::Free() {
Safe_Release(m_pTransformCom);

	for (auto&amp; MyPair : m_Components) { Safe_Release(MyPair.second); }
	m_Components.clear();

	Safe_Release(m_pGameInstance);
	Safe_Release(m_pContext);
	Safe_Release(m_pDevice);
}

HRESULT CGameObject::Initialize_Prototype() {
return S_OK;
}

HRESULT CGameObject::Initialize_GameObject(void* pArg) {
m_pTransformCom = CTransform::Create(m_pDevice, m_pContext, pArg);
NULL_CHECK_RETURN(m_pTransformCom, L"Variable is Null : CGameObject\nm_pTransformCom", E_FAIL);
m_Components.emplace(g_strTransformTag, m_pTransformCom);
Safe_AddRef(m_pTransformCom);

	if (pArg) {
		GAMEOBJECT_DESC* pDesc = static_cast&lt;GAMEOBJECT_DESC*&gt;(pArg);
		if (pDesc-&gt;fCullingRange &gt; 0.f) { m_fCullingRange = pDesc-&gt;fCullingRange; }
	}

	return S_OK;
}

HRESULT CGameObject::Add_Component(_uint iLevelIndex, const _wstring&amp; strProtoTag, const _wstring&amp; strComponentTag, CComponent** ppOut, void* pArg) {
CComponent* pComponent = m_pGameInstance-&gt;Clone_Prototype(iLevelIndex, strProtoTag, pArg);
NULL_CHECK_RETURN(pComponent, L"Variable is Null : CGameObject::Add_Component\npComponent", E_FAIL);

	if (Find_Component(strComponentTag)) { return E_FAIL; }

	m_Components.emplace(strComponentTag, pComponent);
	*ppOut = pComponent;
	Safe_AddRef(pComponent);

	return S_OK;
}

CComponent* CGameObject::Find_Component(const _wstring&amp; strComponentTag, _int iPartObjID) {
auto iter = m_Components.find(strComponentTag);

	if (iter == m_Components.end()) { return nullptr; }

	return iter-&gt;second;
}</code></pre>
</details>

### 프로토타입 패턴

오브젝트 생성 비용을 줄이기 위해 프로토타입 패턴을 사용합니다.
레벨 로딩 시점에 각 오브젝트의 원본(프로토타입)을 태그와 함께 등록해 두고, 실제 배치할 때는 `Clone_Prototype`으로 복제본을 만들어 레이어에 추가합니다.
`Add_GameObject_To_Layer`는 프로토타입을 복제한 뒤 해당 레이어가 없으면 새로 생성하여 등록하고, 있으면 기존 레이어에 오브젝트를 추가합니다.

<details class="code-block">
<summary>GameObject_Manager.cpp <span class="file-badge">프로토타입 등록·복제·레이어 관리</span></summary>
<pre markdown="0"><code class="language-cpp">#include "GameObject_Manager.h"
#include "GameObject.h"
#include "Layer.h"

HRESULT CGameObject_Manager::Add_Prototype(const _wstring&amp; strProtoTag, CGameObject* pProto) {
if (Find_Prototype(strProtoTag)) { return E_FAIL; }

	m_Prototypes.emplace(strProtoTag, pProto);

	return S_OK;
}

CGameObject* CGameObject_Manager::Clone_Prototype(const _wstring&amp; strProtoTag, void* pArg) {
CGameObject* pProto = Find_Prototype(strProtoTag);
NULL_CHECK_RETURN(pProto, L"Variable is Null : CGameObject_Manager::Add_GameObject_To_Layer\npProto", nullptr);

	CGameObject* pGameObject = pProto-&gt;Clone(pArg);
	NULL_CHECK_RETURN(pProto, L"Variable is Null : CGameObject_Manager::Add_GameObject_To_Layer\npGameObject", nullptr);

	return pGameObject;
}

CGameObject* CGameObject_Manager::Add_GameObject_To_Layer(_uint iLevelIndex, const _wstring&amp; strLayerTag, const _wstring&amp; strProtoTag, void* pArg) {
CGameObject* pProto = Find_Prototype(strProtoTag);
NULL_CHECK_RETURN(pProto, L"Variable is Null : CGameObject_Manager::Add_GameObject_To_Layer\npProto", nullptr);

	CGameObject* pGameObject = pProto-&gt;Clone(pArg);
	NULL_CHECK_RETURN(pProto, L"Variable is Null : CGameObject_Manager::Add_GameObject_To_Layer\npGameObject", nullptr);

	CLayer* pLayer = Find_Layer(iLevelIndex, strLayerTag);

	if (!pLayer) {
		pLayer = CLayer::Create();
		if (!pLayer) { MSG_BOX(L"Variable is Null : CGameObject_Manager::Add_GameObject_To_Layer\npLayer"); Safe_Release(pGameObject); return nullptr; }

		pLayer-&gt;Add_GameObject(pGameObject);
		m_pLayers[iLevelIndex].emplace(strLayerTag, pLayer);
	}
	else { pLayer-&gt;Add_GameObject(pGameObject); }

	return pGameObject;
}

HRESULT CGameObject_Manager::Clear_LayerByLevel(_uint iLevelIndex) {
if (iLevelIndex &gt;= m_iNumLevels || iLevelIndex &lt; 0) { return E_FAIL; }

	for (auto&amp; MyPair : m_pLayers[iLevelIndex]) { Safe_Release(MyPair.second); }
	m_pLayers[iLevelIndex].clear();

	return S_OK;
}

void CGameObject_Manager::Priority_Update_GameObject(const _float&amp; fTimeDelta) {
for (size_t i = 0; i &lt; m_iNumLevels; ++i) { for (auto&amp; MyPair : m_pLayers[i]) { if (MyPair.second) { MyPair.second-&gt;Priority_Update_GameObject(fTimeDelta); } } }
}

void CGameObject_Manager::Update_GameObject(const _float&amp; fTimeDelta) {
for (size_t i = 0; i &lt; m_iNumLevels; ++i) { for (auto&amp; MyPair : m_pLayers[i]) { if (MyPair.second) { MyPair.second-&gt;Update_GameObject(fTimeDelta); } } }
}

void CGameObject_Manager::Late_Update_GameObject(const _float&amp; fTimeDelta) {
for (size_t i = 0; i &lt; m_iNumLevels; ++i) { for (auto&amp; MyPair : m_pLayers[i]) { if (MyPair.second) { MyPair.second-&gt;Late_Update_GameObject(fTimeDelta); } } }
}

CGameObject_Manager* CGameObject_Manager::Create(_uint iNumLevels) {
CGameObject_Manager* pInstance = new CGameObject_Manager();

	FAILED_CHECK_RELEASE(pInstance-&gt;Initialize_GameObject_Manager(iNumLevels), pInstance, L"Failed to Create : CGameObject_Manager");

	return pInstance;
}

void CGameObject_Manager::Free() {
for (size_t i = 0; i &lt; m_iNumLevels; ++i) { for (auto&amp; MyPair : m_pLayers[i]) { Safe_Release(MyPair.second); } m_pLayers[i].clear(); }
Safe_Delete_Array(m_pLayers);

	for (auto&amp; MyPair : m_Prototypes) { Safe_Release(MyPair.second); }
	m_Prototypes.clear();
}

HRESULT CGameObject_Manager::Initialize_GameObject_Manager(_uint iNumLevels) {
if (m_pLayers) { return E_FAIL; }

	m_iNumLevels = iNumLevels;
	m_pLayers = new LAYERS[m_iNumLevels];

	return S_OK;
}

CGameObject* CGameObject_Manager::Find_Prototype(const _wstring&amp; strProtoTag) {
auto iter = m_Prototypes.find(strProtoTag);

	if (iter == m_Prototypes.end()) { return nullptr; }

	return iter-&gt;second;
}

CComponent* CGameObject_Manager::Get_Component(_uint iLevelIndex, const _wstring&amp; strLayerTag, const _wstring&amp; strComponentTag, _uint iIndex, _int iPartObjID) {
CLayer* pLayer = Find_Layer(iLevelIndex, strLayerTag);
NULL_CHECK_RETURN(pLayer, L"Variable is Null : pLayer", nullptr);

	return pLayer-&gt;Get_Component(strComponentTag, iIndex, iPartObjID);
}

CGameObject* CGameObject_Manager::Find_GameObject(_uint iLevelIndex, const _wstring&amp; strLayerTag, _uint iIndex) {
if (iLevelIndex &gt;= m_iNumLevels || iLevelIndex &lt; 0) { return nullptr; }

	auto iter = m_pLayers[iLevelIndex].find(strLayerTag);

	if (iter == m_pLayers[iLevelIndex].end()) { return nullptr; }

	return iter-&gt;second-&gt;Find_GameObject(iIndex);
}

CLayer* CGameObject_Manager::Find_Layer(_uint iLevelIndex, const _wstring&amp; strLayerTag) {
if (iLevelIndex &gt;= m_iNumLevels || iLevelIndex &lt; 0) { return nullptr; }

	auto iter = m_pLayers[iLevelIndex].find(strLayerTag);

	if (iter == m_pLayers[iLevelIndex].end()) { return nullptr; }

	return iter-&gt;second;
}</code></pre>
</details>

## 플레이어 시스템

### 상태·방향 비트플래그와 입력 처리

플레이어의 상태(`STATE`)와 방향(`DIRECT`)은 비트플래그로 정의되어, 여러 상태를 동시에 표현하거나 방향키 조합으로 8방향 회전을 처리할 수 있습니다.
`Key_Input`은 DirectInput 상태를 조회하여 이동·구르기·무기 교체·공격 콤보를 처리합니다.
공격은 좌클릭 연타로 3단 콤보(`STATE_ATTACK_0` → `1` → `2`)가 이어지고, 우클릭은 스페셜 게이지를 소모하는 특수 공격입니다.
방향키 조합에 따라 `Turn_RotationY`로 캐릭터를 해당 각도로 회전시킵니다.

<details class="code-block">
<summary>Player.h <span class="file-badge">플레이어 클래스 구조</span></summary>
<pre markdown="0"><code class="language-cpp">#pragma once
#include "Client_Define.h"
#include "Entity.h"

BEGIN(Engine)
class CCollider;
END

BEGIN(Client)

class CPlayer final : public CEntity {
public:
enum PARTID { PART_BODY, PART_TOOL, PART_SUB, PART_SPECIAL, PART_HELMET, PART_CHEST, PART_GLOVES, PART_PANTS, PART_SHOES, PART_EFFECT, PART_END };

	enum STATE { STATE_IDLE					= 0x00000001,
				 STATE_WALK					= 0x00000002,
				 STATE_ROLLING				= 0x00000004,
				 STATE_COLLECT_AXE			= 0x00000008,
				 STATE_COLLECT_PICKAXE		= 0x00000010,
				 STATE_COLLECT_GROUND		= 0x00000020,
				 STATE_INTERECT				= 0x00000040,
				 STATE_CHEST_OPEN			= 0x00000080,
				 STATE_KNEELING_BEGIN		= 0x00000100,
				 STATE_KNEELING_IDLE		= 0x00000200,
				 STATE_REVIVE				= 0x00000400,
				 STATE_HURT					= 0x00000800,
				 STATE_KNOCKBACK			= 0x00001000,
				 STATE_ATTACK_0				= 0x00002000,
				 STATE_ATTACK_0_RETURN		= 0x00004000,
				 STATE_ATTACK_1				= 0x00008000,
				 STATE_ATTACK_1_RETURN		= 0x00010000,
				 STATE_ATTACK_2				= 0x00020000,
				 STATE_ATTACK_2_RETURN		= 0x00040000,
				 STATE_ATTACK_SPECIAL		= 0x00080000,
	};

	enum DIRECT { DIR_NONE = 0x00000000,
				  DIR_NORTH = 0x00000001,
				  DIR_WEST = 0x00000002,
				  DIR_SOUTH = 0x00000004,
				  DIR_EAST = 0x00000008 };

	enum HASWEAPON { HAS_NONE = 0x00000000, 
					 HAS_SWORD = 0x00000001 };

	enum HASTOOL { HAS_AXE = 0x00000001,
				   HAS_PICKAXE = 0x00000002 };

	enum WEAPONID { WEAPON_NONE, WEAPON_SUB, WEAPON_SPECIAL, WEAPON_SWORD, WEAPON_END };
	enum TOOLID { TOOL_AXE, TOOL_PICKAXE, TOOL_END };
	enum ARMORID { ARMOR_HELMET, ARMOR_CHESTPLATE, ARMOR_GLOVES, ARMOR_PANTS, ARMOR_SHOES, ARMOR_END };

private:
explicit CPlayer(ID3D11Device* pDevice, ID3D11DeviceContext* pContext) : CEntity(pDevice, pContext) { }
explicit CPlayer(const CPlayer&amp; rhs) : CEntity(rhs) { }
virtual ~CPlayer() = default;

public:
const _float&amp;						Get_ExpPercent() { return m_iExp / (_float)m_iMaxExp; }
const _int&amp;							Get_MaxExp() { return m_iMaxExp; }
const _int&amp;							Get_Level() { return m_iLevel; }
const _uint&amp;						Get_Weapon() { return m_iWeapon; }
const _float&amp;						Get_SpecialRatio();
_uint								Get_Special() { return (_uint)floor(m_fNumSpecial); }
const _bool&amp;						Get_Tool(const TOOLID eID);

public:
void								Increase_Special(const _float&amp; fPoint);
virtual const _bool&amp;				Take_Damage(_int iDmg) override;
void								Add_Exp(const _uint&amp; iExp);

public:
virtual HRESULT						Priority_Update_GameObject(const _float&amp; fTimeDelta) override;
virtual HRESULT						Update_GameObject(const _float&amp; fTimeDelta) override;
virtual HRESULT						Late_Update_GameObject(const _float&amp; fTimeDelta) override;
virtual HRESULT						Render_GameObject() override;

public:
static CPlayer*						Create(ID3D11Device* pDevice, ID3D11DeviceContext* pContext);
virtual CGameObject*				Clone(void* pArg) override;
virtual void						Free() override;

private:
virtual HRESULT						Initialize_Prototype() override;
virtual HRESULT						Initialize_GameObject(void* pArg) override;

private:
HRESULT								Add_Components();
HRESULT								Add_Parts();
HRESULT								Bind_ShaderResources();
HRESULT								Key_Input(const _float&amp; fTimeDelta);
HRESULT								Change_Tools(TOOLID eToolID);
HRESULT								Harvest_Resources();

private:
_bool								m_bLock = { false };

	_uint								m_iState = { STATE_IDLE };
	_uint								m_iDirect = { DIR_NONE };
	_uint								m_iWeapon = { HAS_NONE };
	_uint								m_iTools = { 0x00000000 };

	vector&lt;class CPart*&gt;				m_Tools;
	vector&lt;class CPart*&gt;				m_Weapons;

	_float								m_fRollingTime = { 0.f };

	Engine::CCollider*					m_pColliderCom = { nullptr };

	_uint								m_iAttackCombo = { 0 };
	_float								m_fMaxComboTime = { 1.5f };
	_float								m_fComboTime = { 0.f };

	_int								m_iMaxExp = { 1 };
	_int								m_iLevel = { 1 };

	_float								m_fMaxSpecial = { 0 };
	_float								m_fNumSpecial = { 0 };

	class CGameObject*					m_pHarvest = { nullptr };
	class CGameObject*					m_pTarget = { nullptr };
};

END</code></pre>
</details>

<details class="code-block">
<summary>Player.cpp — Key_Input <span class="file-badge">입력·이동·콤보 처리</span></summary>
<pre markdown="0"><code class="language-cpp">HRESULT CPlayer::Key_Input(const _float&amp; fTimeDelta) {
    if (m_pGameInstance-&gt;Get_DIKeyDown(DIK_9)) {
        if (m_bDead &amp;&amp; m_iState &amp; STATE_KNEELING_IDLE) {
            m_iState = STATE_REVIVE;
            m_bDead = false;
        }
    }

    if (!m_bLock) {
        if (m_pGameInstance-&gt;Get_DIKeyState(DIK_L)) {
            if (m_pGameInstance-&gt;Get_DIKeyDown(DIK_8)) {
                m_iState = STATE_KNOCKBACK;
                m_bLock = true;
            }
            else if (m_pGameInstance-&gt;Get_DIKeyDown(DIK_9)) {
                if (!m_bDead &amp;&amp; !(m_iState &amp; STATE_KNEELING_IDLE)) {
                    m_iState = STATE_KNEELING_BEGIN;
                    m_bDead = true;
                    m_bLock = true;
                }
            }
            else if (m_pGameInstance-&gt;Get_DIKeyDown(DIK_0)) {
                if (!(m_iWeapon &amp; HAS_SWORD)) {
                    Safe_Release(m_Parts[PART_TOOL]);
                    m_Parts[PART_TOOL] = m_Weapons[WEAPON_SWORD];
                    Safe_AddRef(m_Parts[PART_TOOL]);
                    m_iWeapon = HAS_SWORD;
                }
                else {
                    Safe_Release(m_Parts[PART_TOOL]);
                    m_Parts[PART_TOOL] = m_Weapons[WEAPON_NONE];
                    Safe_AddRef(m_Parts[PART_TOOL]);
                    m_iWeapon = HAS_NONE;
                }
            }
        }

        if (m_pGameInstance-&gt;Get_DIKeyDown(DIK_SPACE)) {
            if (!(m_iState &amp; STATE_ROLLING)) {
                m_iState = STATE_ROLLING;
                m_fRollingTime = 0.f;
                m_bLock = true;
            }
        }

        if (m_pGameInstance-&gt;Get_DIKeyDown(DIK_W)) { if (!(m_iDirect &amp; DIR_SOUTH)) { m_iDirect |= DIR_NORTH; } }
        if (m_pGameInstance-&gt;Get_DIKeyDown(DIK_S)) { if (!(m_iDirect &amp; DIR_NORTH)) { m_iDirect |= DIR_SOUTH; } }
        if (m_pGameInstance-&gt;Get_DIKeyDown(DIK_A)) { if (!(m_iDirect &amp; DIR_EAST)) { m_iDirect |= DIR_WEST; } }
        if (m_pGameInstance-&gt;Get_DIKeyDown(DIK_D)) { if (!(m_iDirect &amp; DIR_WEST)) { m_iDirect |= DIR_EAST; } }

        if (m_pGameInstance-&gt;Get_DIMouseDown(DIM_LB)) {
            if (m_iState &amp; STATE_IDLE || m_iState &amp; STATE_WALK || m_iState &amp; STATE_ATTACK_0_RETURN || m_iState &amp; STATE_ATTACK_1_RETURN) {
                if (m_iAttackCombo == 0) { m_iState = STATE_ATTACK_0; ++m_iAttackCombo; }
                else if (m_iAttackCombo == 1) { m_iState = STATE_ATTACK_1; ++m_iAttackCombo; }
                else if (m_iAttackCombo == 2) { m_iState = STATE_ATTACK_2; m_iAttackCombo = 0; }
                m_fComboTime = 0.f;
                m_bLock = true;
                if (m_iWeapon &amp; HAS_SWORD) { static_cast&lt;CSword*&gt;(m_Parts[PART_TOOL])-&gt;Disable(); }
                else if (m_iWeapon == HAS_NONE) {
                    if (m_iAttackCombo &lt; 2) { static_cast&lt;CHand*&gt;(m_Parts[PART_TOOL])-&gt;Disable(); }
                    else { static_cast&lt;CHand*&gt;(m_Parts[PART_SUB])-&gt;Disable(); }
                }
            }
        }
        else if (m_pGameInstance-&gt;Get_DIMouseDown(DIM_RB) &amp;&amp; m_fNumSpecial / 1.f &gt; 0.f) {
            if (m_iState &amp; STATE_IDLE || m_iState &amp; STATE_WALK) {
                m_iState = STATE_ATTACK_SPECIAL;
                m_bLock = true;
                --m_fNumSpecial;
                if (m_iWeapon == HAS_NONE) { static_cast&lt;CHand*&gt;(m_Parts[PART_SPECIAL])-&gt;Disable(); }
            }
        }
    }

    if (m_pGameInstance-&gt;Get_DIKeyUp(DIK_W)) { if (m_iDirect &amp; DIR_NORTH) { m_iDirect ^= DIR_NORTH; } }
    if (m_pGameInstance-&gt;Get_DIKeyUp(DIK_S)) { if (m_iDirect &amp; DIR_SOUTH) { m_iDirect ^= DIR_SOUTH; } }
    if (m_pGameInstance-&gt;Get_DIKeyUp(DIK_A)) { if (m_iDirect &amp; DIR_WEST) { m_iDirect ^= DIR_WEST; } }
    if (m_pGameInstance-&gt;Get_DIKeyUp(DIK_D)) { if (m_iDirect &amp; DIR_EAST) { m_iDirect ^= DIR_EAST; } }

    if (m_iDirect == DIR_NORTH) { m_pTransformCom-&gt;Turn_RotationY(0.f, fTimeDelta); }
    if (m_iDirect == DIR_SOUTH) { m_pTransformCom-&gt;Turn_RotationY(XMConvertToRadians(180.f), fTimeDelta); }
    if (m_iDirect == DIR_WEST) { m_pTransformCom-&gt;Turn_RotationY(XMConvertToRadians(-90.f), fTimeDelta); }
    if (m_iDirect == DIR_EAST) { m_pTransformCom-&gt;Turn_RotationY(XMConvertToRadians(90.f), fTimeDelta); }
    if (m_iDirect &amp; DIR_NORTH &amp;&amp; m_iDirect &amp; DIR_WEST) { m_pTransformCom-&gt;Turn_RotationY(XMConvertToRadians(-45.f), fTimeDelta); }
    if (m_iDirect &amp; DIR_NORTH &amp;&amp; m_iDirect &amp; DIR_EAST) { m_pTransformCom-&gt;Turn_RotationY(XMConvertToRadians(45.f), fTimeDelta); }
    if (m_iDirect &amp; DIR_SOUTH &amp;&amp; m_iDirect &amp; DIR_WEST) { m_pTransformCom-&gt;Turn_RotationY(XMConvertToRadians(225.f), fTimeDelta); }
    if (m_iDirect &amp; DIR_SOUTH &amp;&amp; m_iDirect &amp; DIR_EAST) { m_pTransformCom-&gt;Turn_RotationY(XMConvertToRadians(135.f), fTimeDelta); }

    if (m_pGameInstance-&gt;Get_DIKeyState(DIK_W) || m_pGameInstance-&gt;Get_DIKeyState(DIK_A) || m_pGameInstance-&gt;Get_DIKeyState(DIK_S) || m_pGameInstance-&gt;Get_DIKeyState(DIK_D)) { if (!(m_iState &amp; STATE_WALK) &amp;&amp; (m_iState &amp; STATE_IDLE)) { m_iState = STATE_WALK; } }

    if (m_iDirect == DIR_NONE) { if (m_iState &amp; STATE_WALK) { m_iState = STATE_IDLE; } }

    return S_OK;
}</code></pre>
</details>

### 무기 (Sword / Hand)

무기는 플레이어 본체에 종속된 파트(`CPart`)로 구현되며, 부모의 상태 포인터(`m_pParentState`)를 참조해 공격 모션 중에만 충돌체를 활성화합니다.
`Sword`의 `Priority_Update_GameObject`는 공격 상태에 진입하면 타이머를 초기화하고, 일정 시간이 지난 뒤 충돌을 켭니다.
`Update_GameObject`에서 몬스터와 충돌(ENTER)하면 데미지를 입히고, 특수 공격이 아닐 때는 스페셜 게이지를 충전합니다.
`Late_Update_GameObject`에서는 부모 소켓 행렬에 자신의 로컬 변환을 곱해 손에 무기가 붙은 것처럼 월드 행렬을 계산합니다.

<details class="code-block">
<summary>Sword.cpp <span class="file-badge">무기 충돌·소켓 부착</span></summary>
<pre markdown="0"><code class="language-cpp">HRESULT CSword::Priority_Update_GameObject(const _float&amp; fTimeDelta) {
	if (!(*m_pParentState &amp; CPlayer::STATE_ATTACK_0) &amp;&amp; !(*m_pParentState &amp; CPlayer::STATE_ATTACK_1) &amp;&amp; !(*m_pParentState &amp; CPlayer::STATE_ATTACK_2) &amp;&amp; !(*m_pParentState &amp; CPlayer::STATE_ATTACK_SPECIAL) &amp;&amp; m_bEnable) { m_pColliderCom-&gt;Set_CollisionEnable(false); m_bEnable = false; }
	if (((*m_pParentState &amp; CPlayer::STATE_ATTACK_0) || (*m_pParentState &amp; CPlayer::STATE_ATTACK_1) || (*m_pParentState &amp; CPlayer::STATE_ATTACK_2) || (*m_pParentState &amp; CPlayer::STATE_ATTACK_SPECIAL)) &amp;&amp; !m_bEnable) {
		m_bEnable = true;
		m_fTimeSum = 0.f;
	}

	m_fTimeSum += fTimeDelta;

	if (m_fTimeSum &gt;= 0.5f) { m_pColliderCom-&gt;Set_CollisionEnable(true); }

	return S_OK;
}

HRESULT CSword::Update_GameObject(const _float&amp; fTimeDelta) {
if (m_bEnable &amp;&amp; m_pColliderCom-&gt;Get_CollisionEnable()) {
for (auto pGameObject : *COLLISION_MANAGER-&gt;Get_Collisions(L"Monster")) {
if (COLLISION_MANAGER-&gt;IsCollision(pGameObject, this) == CCollider::STATE_ENTER) {
static_cast&lt;CEntity*&gt;(pGameObject)-&gt;Take_Damage(static_cast&lt;CEntity*&gt;(m_pGameInstance-&gt;Get_Player())-&gt;Get_Damage());
if (!(*m_pParentState &amp; CPlayer::STATE_ATTACK_SPECIAL)) { static_cast&lt;CPlayer*&gt;(m_pGameInstance-&gt;Get_Player())-&gt;Increase_Special(0.05f); }
}
}
}

	return S_OK;
}

HRESULT CSword::Late_Update_GameObject(const _float&amp; fTimeDelta) {
_matrix		SocketMatrix = XMLoadFloat4x4(m_pSocketMatrix);

	for (size_t i = 0; i &lt; 3; i++) { SocketMatrix.r[i] = XMVector3Normalize(SocketMatrix.r[i]); }

	XMStoreFloat4x4(&amp;m_WorldMatrix, m_pTransformCom-&gt;Get_WorldMatrix() * SocketMatrix * XMLoadFloat4x4(m_pParentMatrix));

	FAILED_CHECK_RETURN(m_pColliderCom-&gt;Update_Collider(XMLoadFloat4x4(&amp;m_WorldMatrix)), L"Failed to Update Collider", E_FAIL);

	if (*m_pParentWeapon &amp; CPlayer::HAS_SWORD) { FAILED_CHECK_RETURN(m_pGameInstance-&gt;Add_RenderGameObject(m_eRenderGroup, this), L"Failed to Add RenderGroup", E_FAIL); }

#ifdef _DEBUG
FAILED_CHECK_RETURN(m_pGameInstance-&gt;Add_DebugComponent(m_pColliderCom), L"Failed to Excute : Add_DebugComponent", E_FAIL);
#endif

	return S_OK;
}</code></pre>
</details>

## 몬스터 AI

### Seekling — 추적·근접·원거리 복합

Seekling은 플레이어와 거대 나무(Yggdrasil)를 상황에 따라 번갈아 목표로 삼습니다.
`LookAtPos`에서 플레이어와의 거리를 계산해, 가까우면 플레이어를 추적·근접 공격하고, 멀면 Yggdrasil 쪽으로 방향을 틀어 원거리 투사체 공격 상태로 전환합니다.
`FireProjectile`은 원거리 공격 상태일 때 일정 시간이 지나면 발사 소켓 위치에서 투사체를 생성하여 발사합니다.

<details class="code-block">
<summary>Seekling.cpp — LookAtPos / FireProjectile <span class="file-badge">추적·공격 상태 전환</span></summary>
<pre markdown="0"><code class="language-cpp">void CSeekling::LookAtPos(const _float&amp; fTimeDelta) {
	if (m_iState &amp; STATE_IDLE || m_iState &amp; STATE_WALK || m_iState &amp; STATE_HURT) { m_fDelayAcc += fTimeDelta; }

	_vector vSrc = m_pTransformCom-&gt;Get_Info(CTransform::INFO_POS);
	_vector vDst = m_pPlayer-&gt;Get_Transform()-&gt;Get_Info(CTransform::INFO_POS);

	_float fDist = XMVectorGetX(XMVector3Length(vDst - vSrc));

	_float fAngle = { 0.f };

	if (fDist &lt;= 10.f) {
		fAngle = CCalculator::LookAtAngle(vSrc, vDst);

		if (!(m_iState &amp; STATE_ATTACK_PLAYER) || !(m_iState &amp; STATE_ATTACK_YGGDRASIL)) { m_pTransformCom-&gt;Turn_RotationY(fAngle, fTimeDelta); }

		if (fDist &gt; 5.f &amp;&amp; m_iState &amp; STATE_IDLE) { m_iState = STATE_WALK; }
		else if (fDist &lt;= 4.f &amp;&amp; (m_iState &amp; STATE_WALK || m_iState &amp; STATE_IDLE) &amp;&amp; m_fDelayAcc &gt;= m_fDelay) { m_iState = STATE_ATTACK_PLAYER; static_cast&lt;CSeekling_Weapon*&gt;(m_Parts[PART_WEAPON])-&gt;Disable(); }
	}
	else {
		vDst = m_pYggdrasil-&gt;Get_Transform()-&gt;Get_Info(CTransform::INFO_POS);

		fDist = XMVectorGetX(XMVector3Length(vDst - vSrc));
		fAngle = CCalculator::LookAtAngle(vSrc, vDst);

		if ((fDist &lt;= 11.5f) &amp;&amp; (m_iState &amp; STATE_WALK || m_iState &amp; STATE_IDLE) &amp;&amp; m_fDelayAcc &gt;= m_fDelay) { m_iState = STATE_ATTACK_YGGDRASIL; m_bFire = false; m_fTimeAcc = 0.f; }
		else if ((fDist &lt;= 11.5f) &amp;&amp; m_fDelayAcc &lt; m_fDelay) { m_iState = STATE_IDLE; }
		else if (m_iState &amp; STATE_IDLE) { m_iState = STATE_WALK; }

		if (!(m_iState &amp; STATE_ATTACK_PLAYER) || !(m_iState &amp; STATE_ATTACK_YGGDRASIL)) { m_pTransformCom-&gt;Turn_RotationY(fAngle, fTimeDelta); }
	}

	m_pTransformCom-&gt;RotationSlerp(fTimeDelta);
}

void CSeekling::FireProjectile(const _float&amp; fTimeDelta) {
if (m_iState != STATE_ATTACK_YGGDRASIL || m_bFire) { return; }

	m_fTimeAcc += fTimeDelta;

	if (m_fTimeAcc &lt; 0.8f) { return; }

	m_bFire = true;

	CSeekling_Projectile::SEEKLING_PROJECTILE_DESC pDesc = { };
	pDesc.fRotationPerSec = 0.f;
	pDesc.fSpeedPerSec = 10.f;
	pDesc.fLifeTime = 2.f;
	XMStoreFloat4(&amp;pDesc.vFireDir, m_pTransformCom-&gt;Get_Info(CTransform::INFO_LOOK));
	XMStoreFloat4(&amp;pDesc.vStartPos, XMVectorSetW(XMVector3TransformCoord(XMLoadFloat4x4(static_cast&lt;CSeekling_Body*&gt;(m_Parts[PART_BODY])-&gt;Get_SocketMatrix("Minion_WarriorLDigit31")).r[3], m_pTransformCom-&gt;Get_WorldMatrix()), 1.f));
	pDesc.iDamage = m_iDamage;

	m_pGameInstance-&gt;Add_GameObject_To_Layer(LEVEL_GAMEPLAY, L"Layer_Projectile", L"Proto_GameObject_Seekling_Projectile", &amp;pDesc);
}</code></pre>
</details>

### Bombling — 자폭 돌진

Bombling은 목표에 접근하면 자폭하는 몬스터입니다.
`LookAtPos`에서 플레이어가 사거리 안이면 접근하다가 매우 가까워지면(`fDist < 2.5f`) 폭발 상태로 전환하고, 플레이어가 멀면 Yggdrasil을 향해 이동하다가 근접 시 폭발합니다.
폭발이 확정되면 이후 회전을 멈춰 그 자리에서 터지도록 합니다.

<details class="code-block">
<summary>Bombling.cpp — LookAtPos <span class="file-badge">자폭 돌진 로직</span></summary>
<pre markdown="0"><code class="language-cpp">void CBombling::LookAtPos(const _float&amp; fTimeDelta) {
	if (m_bExplode || m_bDead) { return; }

	_vector vSrc = m_pTransformCom-&gt;Get_Info(CTransform::INFO_POS);
	_vector vDst = m_pPlayer-&gt;Get_Transform()-&gt;Get_Info(CTransform::INFO_POS);

	_float fDist = XMVectorGetX(XMVector3Length(vDst - vSrc));

	_float fAngle = { 0.f };

	if (fDist &lt;= 10.f) {
		fAngle = CCalculator::LookAtAngle(vSrc, vDst);

		if (fDist &gt; 5.f &amp;&amp; m_iState &amp; STATE_IDLE) { m_iState = STATE_WALK; }
		else if (fDist &lt; 2.5f &amp;&amp; !m_bExplode) { m_bExplode = true; m_iState = STATE_EXPLODE; }
	}
	else {
		vDst = m_pYggdrasil-&gt;Get_Transform()-&gt;Get_Info(CTransform::INFO_POS);

		fDist = XMVectorGetX(XMVector3Length(vDst - vSrc));
		fAngle = CCalculator::LookAtAngle(vSrc, vDst);

		if (fDist &gt;= 9.f &amp;&amp; m_iState &amp; STATE_IDLE) { m_iState = STATE_WALK; }
		else if (fDist &lt; 9.f &amp;&amp; !m_bExplode) { m_bExplode = true; m_iState = STATE_EXPLODE; }
	}

	if (!m_bExplode) { m_pTransformCom-&gt;Turn_RotationY(fAngle, fTimeDelta); }

	m_pTransformCom-&gt;RotationSlerp(fTimeDelta);
}</code></pre>
</details>

### Spawner — 야간 몬스터 스폰

Spawner는 밤이 되면 일정 주기로 몬스터를 생성합니다.
`Priority_Update_GameObject`에서 누적 시간이 스폰 딜레이를 넘으면, 미리 정의된 스폰 지점 중 하나를 무작위로 골라 Seekling 또는 Bombling을 생성하고 해당 위치에 배치합니다.

<details class="code-block">
<summary>Spawner.cpp <span class="file-badge">스폰 주기·랜덤 배치</span></summary>
<pre markdown="0"><code class="language-cpp">HRESULT CSpawner::Priority_Update_GameObject(const _float&amp; fTimeDelta) {
	if (m_bDead) { return E_FAIL; }

	m_fTimeAcc += fTimeDelta;

	if (m_fTimeAcc &gt;= m_fSpawnDelay) {
		m_fTimeAcc = 0.f;
		_uint iRndPoint = rand() % (m_iNumSpawnPoints * 6) % m_iNumSpawnPoints;
		CGameObject* pGameObject = { nullptr };
		
		switch (rand() % 2) {
			case 0: {
				pGameObject = m_pGameInstance-&gt;Add_GameObject_To_Layer(LEVEL_GAMEPLAY, L"Layer_Night_Monster", L"Proto_GameObject_Bombling");
				NULL_CHECK_RETURN(pGameObject, L"Failed to Add GameObject(Bombling)", E_FAIL);
				break;
			}
			case 1: {
				pGameObject = m_pGameInstance-&gt;Add_GameObject_To_Layer(LEVEL_GAMEPLAY, L"Layer_Night_Monster", L"Proto_GameObject_Seekling");
				NULL_CHECK_RETURN(pGameObject, L"Failed to Add GameObject(Bombling)", E_FAIL);
				break;
			}
		}
		static_cast&lt;CEntity*&gt;(pGameObject)-&gt;Set_Pos(m_SpawnPoints[iRndPoint].x, m_SpawnPoints[iRndPoint].y, m_SpawnPoints[iRndPoint].z);
	}

	return S_OK;
}

HRESULT CSpawner::Initialize_GameObject(void* pArg) {
m_iNumSpawnPoints = 3;
m_SpawnPoints = new _float4[m_iNumSpawnPoints];
m_SpawnPoints[0] = _float4(-60.f, 0.f, 40.f, 1.f);
m_SpawnPoints[1] = _float4(60.f, 0.f, 40.f, 1.f);
m_SpawnPoints[2] = _float4(0.f, 0.f, -65.f, 1.f);
m_fSpawnDelay = 5.f;

	return S_OK;
}</code></pre>
</details>

## 렌더링 파이프라인

### 디퍼드 렌더링

렌더러는 오브젝트를 렌더 그룹별로 분류해 순서대로 그리는 디퍼드 렌더링 방식입니다.
`Draw_Renderer`가 그림자 → 논블렌드(디퓨즈/노멀/뎁스 MRT) → 라이팅 → 최종 합성 → 블렌드 → UI 순으로 패스를 실행합니다.
반투명 오브젝트(`RENDER_BLEND`)는 그리기 전에 카메라 깊이 기준으로 정렬하여 올바른 알파 합성 순서를 보장합니다.

<details class="code-block">
<summary>Renderer.cpp — Draw_Renderer <span class="file-badge">디퍼드 렌더 패스</span></summary>
<pre markdown="0"><code class="language-cpp">HRESULT CRenderer::Draw_Renderer() {
    FAILED_CHECK_RETURN(Render_Priority(), L"Failed to Excute : Render_Priority", E_FAIL);
    FAILED_CHECK_RETURN(Render_Shadow(), L"Failed to Excute : Render_Shadow", E_FAIL);
    FAILED_CHECK_RETURN(Render_Height(), L"Failed to Excute : Render_Height", E_FAIL);
    FAILED_CHECK_RETURN(Render_NonBlend(), L"Failed to Excute : Render_NonBlend", E_FAIL);
    FAILED_CHECK_RETURN(Render_Lights(), L"Failed to Excute : Render_Lights", E_FAIL);
    FAILED_CHECK_RETURN(Render_Final(), L"Failed to Excute : Render_Final", E_FAIL);
    FAILED_CHECK_RETURN(Render_NonLight(), L"Failed to Excute : Render_NonLight", E_FAIL);
    FAILED_CHECK_RETURN(Render_Blend(), L"Failed to Excute : Render_Blend", E_FAIL);
    FAILED_CHECK_RETURN(Render_UI(), L"Failed to Excute : Render_UI", E_FAIL);

#ifdef _DEBUG
//FAILED_CHECK_RETURN(Render_Debug(), L"Failed to Excute : Render_Debug", E_FAIL);
#endif

    return S_OK;
}

HRESULT CRenderer::Render_NonBlend() {
FAILED_CHECK_RETURN(m_pGameInstance-&gt;Begin_MultiRenderTarget(L"MRT_GameObjects"), L"Failed to Excute : Begin_MultiRenderTarget", E_FAIL);

    for (auto&amp; pGameObject : m_RenderGameObjects[RENDER_NONBLEND]) { if (pGameObject) { pGameObject-&gt;Render_GameObject(); Safe_Release(pGameObject); } }
    m_RenderGameObjects[RENDER_NONBLEND].clear();

    FAILED_CHECK_RETURN(m_pGameInstance-&gt;End_MultiRenderTarget(), L"Failed to Excute : End_MultiRenderTarget", E_FAIL);

    return S_OK;
}

HRESULT CRenderer::Render_Blend() {
m_RenderGameObjects[RENDER_BLEND].sort([](CGameObject* pSrc, CGameObject* pDst)-&gt;_bool { return static_cast&lt;CBlendObject*&gt;(pSrc)-&gt;Get_Depth() &gt; static_cast&lt;CBlendObject*&gt;(pDst)-&gt;Get_Depth(); });

    for (auto&amp; pGameObject : m_RenderGameObjects[RENDER_BLEND]) { if (pGameObject) { pGameObject-&gt;Render_GameObject(); Safe_Release(pGameObject); } }
    m_RenderGameObjects[RENDER_BLEND].clear();

    return S_OK;
}</code></pre>
</details>

### 스키닝 애니메이션 셰이더

캐릭터 메시는 GPU 스키닝으로 애니메이션됩니다.
정점 셰이더에서 각 정점의 본 인덱스(`vBlendIndex`)와 가중치(`vBlendWeight`)로 본 행렬들을 가중 합산하여 최종 본 행렬을 만든 뒤, 정점을 변환합니다.
네 번째 가중치는 나머지 세 개의 합을 1에서 뺀 값으로 계산합니다.

<details class="code-block">
<summary>Shader_VtxAnimMesh.hlsl — VS_MAIN <span class="file-badge">GPU 스키닝 정점 셰이더</span></summary>
<pre markdown="0"><code class="language-hlsl">struct VS_IN {
    float3 vPosition : POSITION;
    float3 vNormal : NORMAL;
    float2 vTexCoord : TEXCOORD0;
    float3 vTangent : TANGENT;
    uint4 vBlendIndex : BLENDINDEX;
    float4 vBlendWeight : BLENDWEIGHT;
};

struct VS_OUT {
float4 vPosition : SV_POSITION;
float4 vNormal : NORMAL;
float2 vTexCoord : TEXCOORD0;
float4 vWorldPos : TEXCOORD1;
float4 vProjPos : TEXCOORD2;
};

VS_OUT VS_MAIN(VS_IN In) {
VS_OUT Out = (VS_OUT)0;

    float fWeightW = 1.f - (In.vBlendWeight.x + In.vBlendWeight.y + In.vBlendWeight.z);

    matrix BoneMatrix = g_BoneMatrices[In.vBlendIndex.x] * In.vBlendWeight.x + g_BoneMatrices[In.vBlendIndex.y] * In.vBlendWeight.y + g_BoneMatrices[In.vBlendIndex.z] * In.vBlendWeight.z + g_BoneMatrices[In.vBlendIndex.w] * fWeightW;

    vector vPosition = mul(float4(In.vPosition, 1.f), BoneMatrix);
    vector vNormal = mul(float4(In.vNormal, 0.f), BoneMatrix);

    matrix matWV, matWVP;

    matWV = mul(g_WorldMatrix, g_ViewMatrix);
    matWVP = mul(matWV, g_ProjMatrix);
    vPosition = mul(vPosition, matWVP);

    Out.vPosition = vPosition;
    Out.vNormal = mul(vNormal, g_WorldMatrix);
    Out.vTexCoord = In.vTexCoord;
    Out.vWorldPos = mul(float4(In.vPosition, 1.f), g_WorldMatrix);
    Out.vProjPos = Out.vPosition;

    return Out;
}</code></pre>
</details>

### 디졸브 이펙트

몬스터 사망 시 노이즈 텍스처 기반 디졸브로 사라지는 효과를 픽셀 셰이더에서 처리합니다.
`smoothstep`으로 디졸브 경계를 계산하고, 경계 부근에서는 테두리 색을 더해 불타는 듯한 가장자리를 표현합니다.
임계값을 시간에 따라 올려 점진적으로 사라지게 합니다.

<details class="code-block">
<summary>Shader_VtxAnimMesh.hlsl — PS_MAIN_DISSOLVE <span class="file-badge">디졸브 픽셀 셰이더</span></summary>
<pre markdown="0"><code class="language-hlsl">PS_OUT PS_MAIN_DISSOLVE(PS_IN In) {
    PS_OUT Out = (PS_OUT)0;

    vector vMtrlDiffuse = g_DiffuseTexture.Sample(LinearSampler, In.vTexCoord);
    float fNoise = g_NoiseTexture.Sample(LinearSampler, In.vTexCoord).r;
    
    if (vMtrlDiffuse.a &lt;= 0.f) { discard; }
    
    float fDissolveFactor = smoothstep(g_fDissolveThreshold - g_fEdgeThickness, g_fDissolveThreshold, fNoise);
    
    vMtrlDiffuse.a *= fDissolveFactor;
    
    if (fDissolveFactor &gt; 0.f &amp;&amp; fDissolveFactor &lt; 1.f) { vMtrlDiffuse.rgb += g_vEdgeColor.rgb * (1.f - fDissolveFactor); }
    else if (fDissolveFactor &lt;= 0.f) { discard; }
    
    Out.vDiffuse = vMtrlDiffuse;
    Out.vNormal = vector(In.vNormal.xyz * 0.5f + 0.5f, 0.f);
    Out.vDepth = vector(In.vProjPos.z / In.vProjPos.w, In.vProjPos.w / g_vNearFarZ.y, 0.f, 0.f);
    
    return Out;
}</code></pre>
</details>