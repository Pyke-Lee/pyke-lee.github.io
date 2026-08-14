---
layout: project
title: Tales of Arise 모작 (DirectX11)
subtitle: DirectX11 프레임워크 기반 액션 RPG 팀 프로젝트
youtube_id: jXNTBYpz7aw
period: 2024.12.06 ~ 2025.02.21 (약 2개월 반)
team: 6인 (한규만[팀장], 홍우석, 김은수, 황권선, 이성호, 김환영)
role: UI, 사운드 매니저
tech: [C++, DirectX11, FMOD, HLSL]
github: https://github.com/Pyke-Lee/FinalTeamProject
---

## 프로젝트 개요

Tales of Arise를 모티브로 한 3D 액션 RPG 팀 프로젝트입니다.
자체 제작한 DirectX11 프레임워크(GameObject–Component 구조, 프로토타입 클론 방식) 위에 게임을 구현했으며, 6인 팀으로 진행했습니다.
저는 이 프로젝트에서 **UI 전반과 사운드 매니저**를 담당했습니다.

전투 HUD, 인게임 메뉴, 요리·상점·여관 등 각종 상호작용 UI와 별 잡기(StarCatch) 미니게임, 그리고 음식·장비 버프를 통합 관리하는 버프 매니저, FMOD 기반 사운드 매니저를 구현했습니다.

## UI 아키텍처

UI는 크게 두 축으로 나뉩니다. 화면 단위의 UI 오브젝트는 엔진의 `CUI`(→ `CGameObject`)를 상속받아 프로토타입 복제 방식으로 생성되고, UI 내부의 개별 버튼은 추상 클래스 `CButton`을 상속받아 만듭니다.
각 UI는 `Opening_Routine` / `Closing_Routine`으로 열고 닫으며, `Priority_Update`에서 입력을, `Update` / `Late_Update`에서 상태를, `Render`에서 셰이더 기반 렌더링을 수행합니다.

### 버튼 베이스 클래스

`CButton`은 모든 버튼의 공통 동작을 정의하는 추상 클래스입니다.
위치·크기·중심·혼합색을 담는 `UI_BUTTON_DESC`로 초기화되고, 마우스가 버튼 사각 영역 안에 있는지(`IsPosInRect`) 판정하는 호버 로직과, 선택 시 강조 테두리를 그리는 `Render_Hilights`를 공통으로 제공합니다.
`Select` / `IsSelected` / `Interect`를 가상 함수로 두어 파생 버튼이 각자의 동작을 구현하도록 했습니다.

<details class="code-block">
<summary>Button.h <span class="file-badge">버튼 추상 베이스 클래스</span></summary>
<pre markdown="0"><code class="language-cpp">#pragma once
#include "Client_Defines.h"
#include "Base.h"
#include "Transform.h"
#include "CustomFont.h"

BEGIN(Engine)
class CGameInstance;
class CVIBuffer_Rect;
class CTexture;
class CShader;
END

BEGIN(Client)

class CButton abstract : public CBase {
public:
struct UI_BUTTON_DESC {
_float2 vPos = { 0.f, 0.f };
_float2 vCenter = { 0.f, 0.f };
_float2 vSize = { 0.f, 0.f };
_float4 vMixColor = { 1.f, 1.f, 1.f, 1.f };
};

protected:
explicit CButton(ID3D11Device* pDevice, ID3D11DeviceContext* pContext);
virtual ~CButton() = default;

public:
_bool							IsHovered();
void							Update_Angle(const _float&amp; fAngle) { m_fAngle = fAngle; }
virtual void					Select() { }
virtual _bool					IsSelected() { return false; }
virtual void					Interect() { }

public:
virtual void					Priority_Update(const _float&amp; fTimeDelta);
virtual void					Update(const _float&amp; fTimeDelta);
virtual void					Late_Update(const _float&amp; fTimeDelta);
virtual HRESULT					Render();

protected:
virtual HRESULT					Initialize(void* pArg);

protected:
virtual void					Free() override;

protected:
_bool							IsPosInRect();
void							Add_Component(const _uint&amp; iLevelIndex, const _wstring&amp; strPrototypeTag, CComponent** ppOut, void* pArg = nullptr);
HRESULT							Render_Hilights(const _bool&amp; bSelect);

protected:
ID3D11Device*					m_pDevice = { nullptr };
ID3D11DeviceContext*			m_pContext = { nullptr };

	Engine::CGameInstance*			m_pGameInstance = { nullptr };
	Engine::CVIBuffer_Rect*			m_pBufferCom = { nullptr };
	Engine::CTransform*				m_pTransformCom = { nullptr };
	Engine::CTexture*				m_pSelectTextureCom[2] = { nullptr };
	Engine::CShader*				m_pShaderCom = { nullptr };

	_float4x4						m_ViewMatrix = { }, m_ProjMatrix = { };

	_float2							m_vCenter = { 0.f, 0.f };
	_float2							m_vSize = { 0.f, 0.f };

	_float4							m_vMixColor = { 1.f, 1.f, 1.f, 1.f };
	_float4							m_vHilightColor = { 1.f, 1.f, 1.f, 1.f };
	_float							m_fAlpha = { 1.f };
	_float							m_fAngle = { 0.f };

	_float2							m_vTextureSize = { 1920.f, 1080.f };
	_float2							m_vRenderSize = { 1920.f, 1080.f };
	_float2							m_vBorderSize = { 1.f, 1.f };
};

END</code></pre>
</details>

`Initialize`에서는 Transform과 버퍼·셰이더·선택 텍스처 컴포넌트를 붙이고, 윈도우 좌표계를 중심 기준(`(x - 화면너비/2)`, `(-y + 화면높이/2)`)으로 변환해 오쏘그래픽 투영 행렬을 세팅합니다.
`IsPosInRect`는 버튼의 사각 경계와 마우스 좌표를 비교해 호버 여부를 반환하고, `Render_Hilights`는 선택된 버튼에 한해 프레임 텍스처와 강조색(`m_vHilightColor`)을 알파 블렌딩으로 덧그립니다.

<details class="code-block">
<summary>Button.cpp <span class="file-badge">버튼 공통 로직 구현</span></summary>
<pre markdown="0"><code class="language-cpp">#include "stdafx.h"
#include "Button.h"
#include "GameInstance.h"
#include "VIBuffer_Rect.h"

CButton::CButton(ID3D11Device* pDevice, ID3D11DeviceContext* pContext) {
m_pDevice = pDevice;
Safe_AddRef(m_pDevice);

	m_pContext = pContext;
	Safe_AddRef(m_pContext);

	m_pGameInstance = CGameInstance::GetInstance();
	Safe_AddRef(m_pGameInstance);
}

_bool CButton::IsHovered() {
return IsPosInRect();
}

void CButton::Priority_Update(const _float&amp; fTimeDelta) {
}

void CButton::Update(const _float&amp; fTimeDelta) {
}

void CButton::Late_Update(const _float&amp; fTimeDelta) {
}

HRESULT CButton::Render() {
return S_OK;
}

HRESULT CButton::Initialize(void* pArg) {
if (pArg) {
UI_BUTTON_DESC* pDesc = static_cast&lt;UI_BUTTON_DESC*&gt;(pArg);

		m_vCenter = pDesc-&gt;vPos + pDesc-&gt;vCenter;
		m_vSize = pDesc-&gt;vSize;
		m_vMixColor = pDesc-&gt;vMixColor;
	}

	m_pTransformCom = CTransform::Create(m_pDevice, m_pContext);
	NULL_CHECK_RETURN(m_pTransformCom, E_FAIL);

	Add_Component(LEVEL_STATIC, L"Prototype_Component_VIBuffer_Rect", reinterpret_cast&lt;CComponent**&gt;(&amp;m_pBufferCom));
	Add_Component(LEVEL_STATIC, L"Prototype_Component_Shader_VtxPosTex", reinterpret_cast&lt;CComponent**&gt;(&amp;m_pShaderCom));
	Add_Component(LEVEL_STATIC, L"Prototype_Component_Texture_UI_Menu_Select", reinterpret_cast&lt;CComponent**&gt;(&amp;m_pSelectTextureCom[0]));
	Add_Component(LEVEL_STATIC, L"Prototype_Component_Texture_UI_Frame", reinterpret_cast&lt;CComponent**&gt;(&amp;m_pSelectTextureCom[1]));

	m_pTransformCom-&gt;Set_Pos(_float4((m_vCenter.x - (g_iWinSizeX &gt;&gt; 1)), (-m_vCenter.y + (g_iWinSizeY &gt;&gt; 1)), 0.f, 1.f));
	m_pTransformCom-&gt;Set_Scaling(m_vSize.x, m_vSize.y, 1.f);

	_uint iNumViewports = { 1 };
	D3D11_VIEWPORT ViewportDesc = { };
	ZeroMemory(&amp;ViewportDesc, sizeof(D3D11_VIEWPORT));
	m_pContext-&gt;RSGetViewports(&amp;iNumViewports, &amp;ViewportDesc);

	m_ViewMatrix = XMMatrixIdentity();
	m_ProjMatrix = XMMatrixOrthographicLH(ViewportDesc.Width, ViewportDesc.Height, 0.f, 1.f);

	m_vHilightColor = { (236.f / 255.f), (208.f / 255.f), (91.f / 255.f), 1.f };

	m_vTextureSize = { 128.f, 32.f };
	m_vRenderSize = m_vSize;
	m_vBorderSize = { 1.f, 1.f };

	return S_OK;
}

void CButton::Free() {
Safe_Release(m_pBufferCom);
Safe_Release(m_pTransformCom);
for (_uint i = 0; i &lt; 2; ++i) { Safe_Release(m_pSelectTextureCom[i]); }
Safe_Release(m_pShaderCom);

	Safe_Release(m_pGameInstance);
	Safe_Release(m_pContext);
	Safe_Release(m_pDevice);
}

_bool CButton::IsPosInRect() {
_float fLeft = { 0.f }, fRight = { 0.f }, fTop = { 0.f }, fBottom = { 0.f };

	fLeft = m_vCenter.x - (m_vSize.x * 0.5f);
	fRight = m_vCenter.x + (m_vSize.x * 0.5f);
	fTop = m_vCenter.y - (m_vSize.y * 0.5f);
	fBottom = m_vCenter.y + (m_vSize.y * 0.5f);

	_float2 vMousePos = m_pGameInstance-&gt;Get_MousePos();

	if (fLeft &lt; vMousePos.x &amp;&amp; vMousePos.x &lt; fRight &amp;&amp; fTop &lt; vMousePos.y &amp;&amp; vMousePos.y &lt; fBottom) { return true; }

	return false;
}

void CButton::Add_Component(const _uint&amp; iLevelIndex, const _wstring&amp; strPrototypeTag, CComponent** ppOut, void* pArg) {
CComponent* pComponent = m_pGameInstance-&gt;Clone_Component(iLevelIndex, strPrototypeTag, pArg);
NULL_CHECK(pComponent);

	*ppOut = pComponent;
}

HRESULT CButton::Render_Hilights(const _bool&amp; bSelect) {
if (!bSelect) { return S_OK; }

	FAILED_CHECK_RETURN(m_pTransformCom-&gt;Bind_ShaderResource(m_pShaderCom, "g_WorldMatrix"), E_FAIL);
	FAILED_CHECK_RETURN(m_pShaderCom-&gt;Bind_Matrix("g_ViewMatrix", &amp;m_ViewMatrix), E_FAIL);
	FAILED_CHECK_RETURN(m_pShaderCom-&gt;Bind_Matrix("g_ProjMatrix", &amp;m_ProjMatrix), E_FAIL);

	if (abs(m_vSize.x - m_vSize.y) &gt;= 2.f * min(abs(m_vSize.x), abs(m_vSize.y))) { FAILED_CHECK_RETURN(m_pSelectTextureCom[1]-&gt;Bind_ShaderResource(m_pShaderCom, "g_DiffuseTexture", 4), E_FAIL); }
	else { FAILED_CHECK_RETURN(m_pSelectTextureCom[1]-&gt;Bind_ShaderResource(m_pShaderCom, "g_DiffuseTexture", 3), E_FAIL); }

	FAILED_CHECK_RETURN(m_pShaderCom-&gt;Bind_RawValue("g_vFirstColor", &amp;Colors::White, sizeof(_float4)), E_FAIL);

	m_fAlpha = 0.25f;
	FAILED_CHECK_RETURN(m_pShaderCom-&gt;Bind_RawValue("g_fAlpha", &amp;m_fAlpha, sizeof(_float)), E_FAIL);

	FAILED_CHECK_RETURN(m_pShaderCom-&gt;Bind_RawValue("g_vTextureFullSize", &amp;m_vTextureSize, sizeof(_float2)), E_FAIL);
	FAILED_CHECK_RETURN(m_pShaderCom-&gt;Bind_RawValue("g_vTexturePieceSize", &amp;m_vRenderSize, sizeof(_float2)), E_FAIL);
	FAILED_CHECK_RETURN(m_pShaderCom-&gt;Bind_RawValue("g_vTextureIndex", &amp;m_vBorderSize, sizeof(_float2)), E_FAIL);

	FAILED_CHECK_RETURN(m_pShaderCom-&gt;Begin(12), E_FAIL);
	FAILED_CHECK_RETURN(m_pBufferCom-&gt;Bind_Buffers(), E_FAIL);
	FAILED_CHECK_RETURN(m_pBufferCom-&gt;Render(), E_FAIL);

	FAILED_CHECK_RETURN(m_pSelectTextureCom[0]-&gt;Bind_ShaderResource(m_pShaderCom, "g_DiffuseTexture", 0), E_FAIL);

	FAILED_CHECK_RETURN(m_pShaderCom-&gt;Bind_RawValue("g_vFirstColor", &amp;m_vHilightColor, sizeof(_float4)), E_FAIL);

	m_fAlpha = 1.f;
	FAILED_CHECK_RETURN(m_pShaderCom-&gt;Bind_RawValue("g_fAlpha", &amp;m_fAlpha, sizeof(_float)), E_FAIL);
	FAILED_CHECK_RETURN(m_pShaderCom-&gt;Bind_RawValue("g_fAngle", &amp;m_fAngle, sizeof(_float)), E_FAIL);

	_float2 vSize = m_pSelectTextureCom[0]-&gt;Get_TextureSize(0);
	_float fAspect = vSize.x / vSize.y;

	FAILED_CHECK_RETURN(m_pShaderCom-&gt;Bind_RawValue("g_fAspect", &amp;fAspect, sizeof(_float)), E_FAIL);

	FAILED_CHECK_RETURN(m_pShaderCom-&gt;Begin(9), E_FAIL);
	FAILED_CHECK_RETURN(m_pBufferCom-&gt;Bind_Buffers(), E_FAIL);
	FAILED_CHECK_RETURN(m_pBufferCom-&gt;Render(), E_FAIL);

	return S_OK;
}</code></pre>
</details>

## 전투 HUD

전투 UI는 조작 중인 플레이어의 체력 게이지와, 타깃팅된 몬스터의 머리 위 체력 바를 렌더링합니다.
핵심은 3D 월드에 있는 캐릭터의 위치를 화면(스크린) 좌표로 투영해 2D UI를 정확히 얹는 것입니다.

`ControlledPlayerInfo`는 플레이어의 월드 행렬에 뷰·투영 행렬을 곱해 클립 공간 좌표를 구하고, w로 나눠 NDC로 만든 뒤 뷰포트 크기를 이용해 스크린 좌표로 환산합니다.
`TargetMonsterInfo`는 먼저 타깃의 콜라이더 타입(AABB/OBB/Sphere)에 맞춰 절두체 컬링으로 화면 밖 대상을 걸러낸 뒤, 바운딩 높이(`vExtents.y`)만큼 올린 위치를 투영해 체력 바를 머리 위에 배치합니다.
두 함수 모두 체력 비율이 급변하지 않도록, 표시용 체력(`m_fPlayerHp`, `m_fTargetHp`)이 실제 비율을 향해 증가 시 빠르게(×0.5) · 감소 시 느리게(×0.3) 따라오도록 보간합니다.

<details class="code-block">
<summary>UI_Battle.cpp <span class="file-badge">HP 바 월드→스크린 투영 (발췌)</span></summary>
<pre markdown="0"><code class="language-cpp">HRESULT CUI_Battle::ControlledPlayerInfo(const _float&amp; fTimeDelta) {
	_matrix WVPMatrix = PLAYERMANAGER-&gt;Get_pControledCombatPlayer()-&gt;Get_WorldMatrix() * m_pGameInstance-&gt;Get_TransformMatrix(CPipeLine::D3DTS_VIEW) * m_pGameInstance-&gt;Get_TransformMatrix(CPipeLine::D3DTS_PROJ);
	XMVECTOR vPos = WVPMatrix.r[3];
	vPos /= vPos.m128_f32[3];

	_uint iNumViewports = { 1 };
	D3D11_VIEWPORT Desc = { };
	m_pContext-&gt;RSGetViewports(&amp;iNumViewports, &amp;Desc);

	m_vPos.x = ((vPos.m128_f32[0] + 1.f) * 0.5f) * Desc.Width + Desc.TopLeftX;
	m_vPos.y = ((1.f - vPos.m128_f32[1]) * 0.5f) * Desc.Height + Desc.TopLeftY;

	m_pSubTransformCom[0]-&gt;Set_ProjPos(m_vPos);
	m_pSubTransformCom[5]-&gt;Set_ProjPos(_float2(m_vPos.x - 132.f, m_vPos.y - 6.f));

	_float fRatio = { 0.f };
	if (PLAYERMANAGER-&gt;Get_pControledCombatPlayer()) { fRatio = PLAYERMANAGER-&gt;Get_pControledCombatPlayer()-&gt;Get_HpRatio(); }
	if (m_fPlayerHp &lt; fRatio) { 
		m_fPlayerHp += fTimeDelta * 0.5f;
		if (fRatio &lt; m_fPlayerHp) { m_fPlayerHp = fRatio; }
	}
	else if (m_fPlayerHp &gt; fRatio) {
		m_fPlayerHp -= fTimeDelta * 0.3f;
		if (m_fPlayerHp &lt; fRatio) { m_fPlayerHp = fRatio; }
	}

	return S_OK;
}

HRESULT CUI_Battle::TargetMonsterInfo(const _float&amp; fTimeDelta) {
CCharacter* pTarget = PLAYERMANAGER-&gt;Get_pControledCombatPlayer()-&gt;Get_Target();
if (!pTarget || pTarget-&gt;Get_Dead() || !pTarget-&gt;Get_Render()) { m_bTargetRender = false; return S_OK; }

	CBounding* pBounding = pTarget-&gt;Get_pActorCollider()-&gt;Get_pBounding();
	switch (pTarget-&gt;Get_pActorCollider()-&gt;Get_Type()) {
		case CCollider::TYPE_AABB:
			if (!m_pGameInstance-&gt;Get_CullingFrustumPt()-&gt;Intersects(*static_cast&lt;CBounding_AABB*&gt;(pBounding)-&gt;Get_Desc())) { m_bTargetRender = false; return S_OK; }
			break;

		case CCollider::TYPE_OBB:
  			if (!m_pGameInstance-&gt;Get_CullingFrustumPt()-&gt;Intersects(*static_cast&lt;CBounding_OBB*&gt;(pBounding)-&gt;Get_Desc())) { m_bTargetRender = false; return S_OK; }
			break;

		case CCollider::TYPE_SPHERE:
			if (!m_pGameInstance-&gt;Get_CullingFrustumPt()-&gt;Intersects(*static_cast&lt;CBounding_Sphere*&gt;(pBounding)-&gt;Get_Desc())) { m_bTargetRender = false; return S_OK; }
			break;
	}

	_float3 vExtents = pTarget-&gt;Get_pActorCollider()-&gt;Get_vExtent();

	_matrix WorldMatrix = pTarget-&gt;Get_WorldMatrix();
	_matrix VPMatrix = m_pGameInstance-&gt;Get_TransformMatrix(CPipeLine::D3DTS_VIEW) * m_pGameInstance-&gt;Get_TransformMatrix(CPipeLine::D3DTS_PROJ);
	XMVECTOR vPos = WorldMatrix.r[3];
	XMVECTOR vPos2 = vPos;
	vPos.m128_f32[1] += vExtents.y;
	vPos = XMVector4Transform(vPos, VPMatrix);
	vPos /= vPos.m128_f32[3];

	vPos2.m128_f32[1] += vExtents.y * 2.f;
	vPos2 = XMVector4Transform(vPos2, VPMatrix);
	vPos2 /= vPos2.m128_f32[3];

	_uint iNumViewports = { 1 };
	D3D11_VIEWPORT Desc = { };
	m_pContext-&gt;RSGetViewports(&amp;iNumViewports, &amp;Desc);

	_float2 vTargetPos = { 0.f, 0.f }, vHpPos = { 0.f, 0.f };

	vTargetPos.x = ((vPos.m128_f32[0] + 1.f) * 0.5f) * Desc.Width + Desc.TopLeftX;
	vTargetPos.y = (((1.f - vPos.m128_f32[1]) * 0.5f) * Desc.Height + Desc.TopLeftY);

	vHpPos.x = ((vPos2.m128_f32[0] + 1.f) * 0.5f) * Desc.Width + Desc.TopLeftX + 75.f;
	vHpPos.y = (((1.f - vPos2.m128_f32[1]) * 0.5f) * Desc.Height + Desc.TopLeftY);

	m_pSubTransformCom[3]-&gt;Set_ProjPos(vTargetPos);
	m_pSubTransformCom[4]-&gt;Set_ProjPos(vHpPos);

	_float fRatio = pTarget ? pTarget-&gt;Get_HpRatio() : 0.f;
	if (m_fTargetHp &lt; fRatio) {
		m_fTargetHp += fTimeDelta * 0.5f;
		if (fRatio &lt; m_fTargetHp) { m_fTargetHp = fRatio; }
	}
	else if (m_fTargetHp &gt; fRatio) {
		m_fTargetHp -= fTimeDelta * 0.3f;
		if (m_fTargetHp &lt; fRatio) { m_fTargetHp = fRatio; }
	}

	m_bTargetRender = true;

	m_vTarget = vTargetPos;

	return S_OK;
}</code></pre>
</details>

## 요리 UI

요리 UI는 학습한 레시피 목록을 카테고리별로 정렬해 버튼으로 보여주고, 조리 시 별 잡기 미니게임의 성공 횟수에 비례한 버프를 적용합니다.

`Sort_Recipes`는 레시피 매니저에서 학습된 레시피를 카테고리(`iIndex == -1`이면 전체)별로 모아 정렬 맵에 담고, 스크롤 가능한 버튼 최대 개수(최대 8개)를 설정한 뒤 화면에 바인딩합니다.
`Update_Recipes`는 스크롤 방향(`bCheck`)에 따라 피벗 인덱스를 이동시키며 표시 목록을 갱신하고, 목록 끝에서는 순환하도록 처리합니다.

<details class="code-block">
<summary>UI_Food.cpp <span class="file-badge">레시피 정렬·스크롤 (발췌)</span></summary>
<pre markdown="0"><code class="language-cpp">HRESULT CUI_Food::Update_Recipes(const _bool&amp; bCheck) {
	auto iter = m_pRecipes.begin();
	if (bCheck) {
		++m_iPivotIndex;
		if (m_iPivotIndex &gt; (_int)m_pRecipes.size() - m_pRecipeBtn[0]-&gt;Get_MaxIndex()) { m_iPivotIndex = 0; }
	}
	else {
		--m_iPivotIndex;
		if (m_iPivotIndex &lt; 0) { m_iPivotIndex = (_int)m_pRecipes.size() - m_pRecipeBtn[0]-&gt;Get_MaxIndex(); }
	}
	advance(iter, m_iPivotIndex);

	for (_uint i = 0; i &lt; m_pRecipeBtn[0]-&gt;Get_MaxIndex(); ++i) {
		CButton_Recipe::UI_BUTTON_RECIPE_DESC Desc = { };

		Desc.strRecipeTag = iter-&gt;first;
		Desc.pBoundRecipe = iter-&gt;second;
		m_pRecipeBtn[i]-&gt;Bind_Recipe(&amp;Desc);

		if (iter != m_pRecipes.end()) { ++iter; }
	}

	return S_OK;
}

HRESULT CUI_Food::Sort_Recipes(const _int&amp; iIndex) {
for (auto&amp; MyPair : m_pRecipes) { Safe_Release(MyPair.second); }
m_pRecipes.clear();

	if (iIndex == -1) { for (_uint i = 0; i &lt; CRecipe::RECIPE_END; ++i) { for (auto&amp; MyPair : *RECIPE_MANAGER-&gt;Get_LearnedRecipes(i)) { m_pRecipes.emplace(MyPair); Safe_AddRef(MyPair.second); } } }
	else { for (auto&amp; MyPair : *RECIPE_MANAGER-&gt;Get_LearnedRecipes(iIndex)) { m_pRecipes.emplace(MyPair); Safe_AddRef(MyPair.second); } }

	m_iSelectRecipe = 0;
	m_pRecipeBtn[0]-&gt;Set_MaxIndex((_uint)m_pRecipes.size() &gt;= 8 ? 8 : (_uint)m_pRecipes.size());
	m_pRecipeBtn[m_iSelectRecipe]-&gt;Select();
	m_iRecipeIndex = 0;
	m_iPivotIndex = 0;

	_uint iNumRecipes = m_pRecipeBtn[0]-&gt;Get_MaxIndex();
	if (iNumRecipes &gt; 8) { iNumRecipes = 8; }
	auto iter = m_pRecipes.begin();
	for (_uint i = 0; i &lt; iNumRecipes; ++i) {
		CButton_Recipe::UI_BUTTON_RECIPE_DESC Desc = { };

		Desc.strRecipeTag = iter-&gt;first;
		Desc.pBoundRecipe = iter-&gt;second;
		m_pRecipeBtn[i]-&gt;Bind_Recipe(&amp;Desc);

		if (iter != m_pRecipes.end()) { ++iter; }
	}

	return S_OK;
}</code></pre>
</details>

`Apply_Buff`는 미니게임 성공 횟수(`iIndex`)를 받아, 선택된 레시피의 버프 타입(최대체력·공격력·방어력·관통)에 따라 효과량을 `0.2 × 성공횟수` 비율로 산출합니다.
산출한 버프 정보를 버프 매니저에 넘겨 적용하고, 재료를 차감한 뒤 페이드·대사 연출과 함께 관련 UI를 닫습니다.

<details class="code-block">
<summary>UI_Food.cpp <span class="file-badge">버프 적용 (발췌)</span></summary>
<pre markdown="0"><code class="language-cpp">void CUI_Food::Apply_Buff(const _uint&amp; iIndex) {
	m_pRecipeBtn[m_iSelectRecipe]-&gt;Deduct_Cooking_Ingredients();

	BUFF_INFO Buff = { };

	Buff.fDuration = m_pRecipeBtn[m_iSelectRecipe]-&gt;Get_Duration() * 60.f;

	switch (m_pRecipeBtn[m_iSelectRecipe]-&gt;Get_BuffType()) {
		case CRecipe::BUFF_MAXHP:
			Buff.iMaxHp = static_cast&lt;_uint&gt;(m_pRecipeBtn[m_iSelectRecipe]-&gt;Get_BuffEffect() * (0.2f * iIndex));
			break;

		case CRecipe::BUFF_DAMAGE:
			Buff.iDamage = static_cast&lt;_uint&gt;(m_pRecipeBtn[m_iSelectRecipe]-&gt;Get_BuffEffect() * (0.2f * iIndex));
			break;

		case CRecipe::BUFF_DEFENSE:
			Buff.iDefense = static_cast&lt;_uint&gt;(m_pRecipeBtn[m_iSelectRecipe]-&gt;Get_BuffEffect() * (0.2f * iIndex));
			break;

		case CRecipe::BUFF_PENETRATION:
			Buff.iPenetration = static_cast&lt;_uint&gt;(m_pRecipeBtn[m_iSelectRecipe]-&gt;Get_BuffEffect() * (0.2f * iIndex));
			break;
	}

	m_pGameInstance-&gt;Play_Sound(SOUND_UI, L"SFX_MapleWhite", 1.f);
	BUFF_MANAGER-&gt;Apply_Buff_From_Food(&amp;Buff);

	CFade::FADE_DESC Desc = { };

	Desc.fFadeIn = 0.25f;
	Desc.fLifeTime = 1.5f;
	Desc.fFadeOut = 0.5f;

	Desc.bDialog = true;
	Desc.iSelectedScript = 1;

	Desc.bClose = true;
	Desc.iNumCloseUI = 3;
	Desc.eCloseID[0] = UI_INN;
	Desc.eCloseID[1] = UI_FOOD;
	Desc.eCloseID[2] = UI_STARCATCH;

	FAILED_CHECK(m_pGameInstance-&gt;UI_Opening_Routine(UI_FADE, &amp;Desc));
}</code></pre>
</details>

## 별 잡기 미니게임

조리 성공도를 결정하는 별 잡기(StarCatch) 미니게임입니다.
게이지 위를 왕복하는 별을 정해진 범위 안에서 멈추면 성공하며, 성공할수록 판정 범위가 좁아지고 별의 속도가 빨라져 난이도가 올라갑니다.

`Priority_Update`에서는 프레임 애니메이션(시작·타임·정지·성공·실패)을 상태 기계처럼 전환하고, 고정 상태(`m_bFix[1]`)일 때 별의 위치 비율(`m_fStarRatio`)을 성공 횟수에 비례한 속도로 0↔1 사이에서 왕복시킵니다.
`StarCatchRange`는 성공 횟수가 늘수록 판정 범위(`m_fRange`)를 좁히고, `CheckStarCatch`는 정지 버튼을 누른 순간 별의 위치가 중앙 판정 범위 안에 있으면 성공(5회 성공 시 최종 성공), 벗어나면 실패로 처리합니다.

<details class="code-block">
<summary>UI_StarCatch.cpp <span class="file-badge">판정 범위·성공 판정 (발췌)</span></summary>
<pre markdown="0"><code class="language-cpp">void CUI_StarCatch::StarCatchRange() {
    m_fRange = 0.3f - (0.04f * m_iSuccess);

    m_pSubTransformCom[11]-&gt;Set_Scaling(454.f * m_fRange, 44.f, 1.f);
    m_pSubTransformCom[11]-&gt;Set_ProjPos(_float2(960.f, 663.f));
}

void CUI_StarCatch::CheckStarCatch() {
if (m_tFrames[TEX_START].bEnable) { return; }

    if (0.5f - (m_fRange * 0.5f) &lt; m_fStarRatio &amp;&amp; m_fStarRatio &lt; 0.5f + (m_fRange * 0.5f)) {
        ++m_iSuccess;
        m_bFix[1] = false;
        m_pSubTransformCom[3]-&gt;Set_ProjPos(_float2(757.f + (406.f * m_fStarRatio), 663.f));
        m_tFrames[TEX_STOP].bEnable = true;
        m_tFrames[TEX_PLUS].bEnable = true;
        m_tFrames[TEX_PLUS].fTimeAcc = 0.f;
        m_tFrames[TEX_PLUS].iCurrentFrame = 0;
        m_tFrames[TEX_TIME].bEnable = false;
        m_tFrames[TEX_TIME].fTimeAcc = 0.f;
        m_tFrames[TEX_TIME].iCurrentFrame = 0;
        m_eButtonState[BUTTON_STOP] = STATE_DISABLE;
        m_pGameInstance-&gt;Play_Sound(SOUND_UI, L"SFX_EnchantStarPerfect", 1.f);
    }
    else {
        m_bFix[1] = false;
        m_tFrames[TEX_FAIL].bEnable = true;
        m_tFrames[TEX_TIME].bEnable = false;
        m_tFrames[TEX_TIME].fTimeAcc = 0.f;
        m_pGameInstance-&gt;Play_Sound(SOUND_UI, L"SFX_EnchantStarMiss", 1.f);
        m_pGameInstance-&gt;Play_Sound(SOUND_UI, L"SFX_EnchantFail", 1.f);
    }
}</code></pre>
</details>

## 버프 매니저

음식·개인·팀·무기·방어구·장신구 등 서로 다른 출처의 버프를 하나로 통합 관리하는 싱글턴 매니저입니다.
출처별 버프를 각각 보관하고, 어떤 버프든 적용·해제될 때마다 `Calc_Buff_Total`로 플레이어별 총합을 다시 계산합니다.

<details class="code-block">
<summary>Buff_Manager.h <span class="file-badge">버프 매니저 클래스 구조</span></summary>
<pre markdown="0"><code class="language-cpp">#pragma once
#include "Client_Defines.h"
#include "Base.h"
#include "Player.h"

#define BUFF_MANAGER CBuff_Manager::Get_Instance()

BEGIN(Engine)
class CGameInstance;
END

BEGIN(Client)

class CBuff_Manager final : public CBase {
NO_COPY(CBuff_Manager)

public:
enum BUFF_TYPE { BUFF_FOOD, BUFF_PERSONAL, BUFF_TEAM, BUFF_WEAPON, BUFF_ARMOR, BUFF_ACCESSORY, BUFF_END };

private:
CBuff_Manager() = default;
virtual ~CBuff_Manager() = default;

public:
static CBuff_Manager*						Get_Instance();
static _uint								Destroy_Instance();

public:
HRESULT										Apply_Buff_From_Food(const BUFF_INFO* pInfo);
HRESULT										Apply_Buff_To_Target(const CPlayer::PLAYER_TYPE eType, const BUFF_INFO* pInfo);
HRESULT										Apply_Buff_To_Team(const BUFF_INFO* pInfo);
HRESULT										Equip_Weapon(const CPlayer::PLAYER_TYPE eType, const BUFF_INFO* pInfo);
HRESULT										Equip_Armor(const CPlayer::PLAYER_TYPE eType, const BUFF_INFO* pInfo);
HRESULT										Equip_Accessory(const CPlayer::PLAYER_TYPE eType, const BUFF_INFO* pInfo);

public:
const _uint&amp;								Get_Buff_MaxHp(const CPlayer::PLAYER_TYPE&amp; eType);
const _uint&amp;								Get_Buff_Damage(const CPlayer::PLAYER_TYPE&amp; eType);
const _uint&amp;								Get_Buff_Defense(const CPlayer::PLAYER_TYPE&amp; eType);
const _uint&amp;								Get_Buff_Penetration(const CPlayer::PLAYER_TYPE&amp; eType);
const BUFF_INFO&amp;							Get_Buff_Info(const CPlayer::PLAYER_TYPE&amp; eType);
const BUFF_INFO&amp;							Get_Info_Weapon(const CPlayer::PLAYER_TYPE&amp; eType);
const BUFF_INFO&amp;							Get_Info_Armor(const CPlayer::PLAYER_TYPE&amp; eType);
const BUFF_INFO&amp;							Get_Info_Accessory(const CPlayer::PLAYER_TYPE&amp; eType);
const BUFF_INFO&amp;							Get_Info_Food() { return m_tBuff_Food; }

public:
const _float								Get_Remaining_Food_Buff_Duration_Percent();
const _float								Get_Remaining_Personal_Buff_Duration_Percent(const CPlayer::PLAYER_TYPE&amp; eType);
const _float								Get_Remaining_Team_Buff_Duration_Percent();

public:
void										Clear_Battle_Buff_Target(const CPlayer::PLAYER_TYPE&amp; eType);
void										Clear_Battle_Buff_All();

public:
HRESULT										Update(const _float&amp; fTimeDelta);

public:
HRESULT										Initialize_Buff_Manager();
virtual void								Free() override;

private:
HRESULT										Calc_Buff_Total();

private:
static CBuff_Manager*						m_pInstance;
Engine::CGameInstance*						m_pGameInstance = { nullptr };

	BUFF_INFO									m_tBuff_Food = { };
	BUFF_INFO									m_tBuff_Team = { };
	BUFF_INFO									m_tBuff_Personal[CPlayer::PLAYER_END] = { };

	BUFF_INFO									m_tBuff_Weapon[CPlayer::PLAYER_END] = { };
	BUFF_INFO									m_tBuff_Armor[CPlayer::PLAYER_END] = { };
	BUFF_INFO									m_tBuff_Accessory[CPlayer::PLAYER_END] = { };

	BUFF_INFO									m_tBuff_Total[CPlayer::PLAYER_END] = { };
};

END</code></pre>
</details>

`Apply_Buff_From_Food` 등 각 적용 함수는 해당 출처 슬롯에 버프 정보를 복사하고 지속시간을 초기화한 뒤 총합을 재계산합니다.
`Update`는 지속시간이 있는 버프(음식·팀·개인)의 타이머를 전역 타임스케일에 맞춰 감소시키고, 만료되면 총합을 다시 계산합니다.
`Calc_Buff_Total`은 기존에 더해둔 최대체력 버프를 먼저 빼고, 만료된 출처를 정리한 뒤, 모든 출처의 스탯을 합산해 플레이어별 총합을 갱신하고 최대체력 증가분을 다시 반영합니다.

<details class="code-block">
<summary>Buff_Manager.cpp <span class="file-badge">버프 합산·갱신 구현</span></summary>
<pre markdown="0"><code class="language-cpp">#include "stdafx.h"
#include "Buff_Manager.h"
#include "GameInstance.h"
#include "Player_Manager.h"

CBuff_Manager* CBuff_Manager::m_pInstance = { nullptr };

CBuff_Manager* CBuff_Manager::Get_Instance() {
if (!m_pInstance) { m_pInstance = new CBuff_Manager(); m_pInstance-&gt;Initialize_Buff_Manager(); }

	return m_pInstance;
}

_uint CBuff_Manager::Destroy_Instance() {
_uint iRefCnt = { 0 };

	if (m_pInstance) {
		iRefCnt = m_pInstance-&gt;Release();
		if (iRefCnt == 0) { m_pInstance = nullptr; }
	}

	return iRefCnt;
}

HRESULT CBuff_Manager::Apply_Buff_From_Food(const BUFF_INFO* pInfo) {
memcpy(&amp;m_tBuff_Food, pInfo, sizeof(BUFF_INFO));
m_tBuff_Food.fTimeAcc = m_tBuff_Food.fDuration;

	return Calc_Buff_Total();;
}

HRESULT CBuff_Manager::Apply_Buff_To_Target(const CPlayer::PLAYER_TYPE eType, const BUFF_INFO* pInfo) {
memcpy(&amp;m_tBuff_Personal[eType], pInfo, sizeof(BUFF_INFO));
m_tBuff_Personal[eType].fTimeAcc = m_tBuff_Personal[eType].fDuration;

	return Calc_Buff_Total();;
}

HRESULT CBuff_Manager::Apply_Buff_To_Team(const BUFF_INFO* pInfo) {
memcpy(&amp;m_tBuff_Team, pInfo, sizeof(BUFF_INFO));
m_tBuff_Team.fTimeAcc = m_tBuff_Team.fDuration;

	return Calc_Buff_Total();;
}

HRESULT CBuff_Manager::Equip_Weapon(const CPlayer::PLAYER_TYPE eType, const BUFF_INFO* pInfo) {
memcpy(&amp;m_tBuff_Weapon[eType], pInfo, sizeof(BUFF_INFO));

	return Calc_Buff_Total();
}

HRESULT CBuff_Manager::Equip_Armor(const CPlayer::PLAYER_TYPE eType, const BUFF_INFO* pInfo) {
memcpy(&amp;m_tBuff_Armor[eType], pInfo, sizeof(BUFF_INFO));

	return Calc_Buff_Total();;
}

HRESULT CBuff_Manager::Equip_Accessory(const CPlayer::PLAYER_TYPE eType, const BUFF_INFO* pInfo) {
memcpy(&amp;m_tBuff_Accessory, pInfo, sizeof(BUFF_INFO));

	return Calc_Buff_Total();;
}

const _uint&amp; CBuff_Manager::Get_Buff_MaxHp(const CPlayer::PLAYER_TYPE&amp; eType) {
return m_tBuff_Total[eType].iMaxHp;
}

const _uint&amp; CBuff_Manager::Get_Buff_Damage(const CPlayer::PLAYER_TYPE&amp; eType) {
return m_tBuff_Total[eType].iDamage;
}

const _uint&amp; CBuff_Manager::Get_Buff_Defense(const CPlayer::PLAYER_TYPE&amp; eType) {
return m_tBuff_Total[eType].iDefense;
}

const _uint&amp; CBuff_Manager::Get_Buff_Penetration(const CPlayer::PLAYER_TYPE&amp; eType) {
return m_tBuff_Total[eType].iPenetration;
}

const BUFF_INFO&amp; CBuff_Manager::Get_Buff_Info(const CPlayer::PLAYER_TYPE&amp; eType) {
return m_tBuff_Total[eType];
}

const BUFF_INFO&amp; CBuff_Manager::Get_Info_Weapon(const CPlayer::PLAYER_TYPE&amp; eType) {
return m_tBuff_Weapon[eType];
}

const BUFF_INFO&amp; CBuff_Manager::Get_Info_Armor(const CPlayer::PLAYER_TYPE&amp; eType) {
return m_tBuff_Armor[eType];
}

const BUFF_INFO&amp; CBuff_Manager::Get_Info_Accessory(const CPlayer::PLAYER_TYPE&amp; eType) {
return m_tBuff_Accessory[eType];
}

const _float CBuff_Manager::Get_Remaining_Food_Buff_Duration_Percent() {
if (m_tBuff_Food.fDuration == 0) { return 0.f; }

	return m_tBuff_Food.fTimeAcc / m_tBuff_Food.fDuration;
}

const _float CBuff_Manager::Get_Remaining_Personal_Buff_Duration_Percent(const CPlayer::PLAYER_TYPE&amp; eType) {
if (m_tBuff_Personal[eType].fDuration == 0) { return 0.f; }

	return m_tBuff_Personal[eType].fTimeAcc / m_tBuff_Personal[eType].fDuration;
}

const _float CBuff_Manager::Get_Remaining_Team_Buff_Duration_Percent() {
if (m_tBuff_Team.fDuration == 0) { return 0.f; }

	return m_tBuff_Team.fTimeAcc / m_tBuff_Team.fDuration;
}

void CBuff_Manager::Clear_Battle_Buff_Target(const CPlayer::PLAYER_TYPE&amp; eType) {
if (m_tBuff_Personal[eType].iMaxHp &gt; 0) { PLAYERMANAGER-&gt;Add_MaxHP(eType, -(_int)m_tBuff_Personal[eType].iMaxHp); }
memset(&amp;m_tBuff_Personal[eType], 0, sizeof(BUFF_INFO));
}

void CBuff_Manager::Clear_Battle_Buff_All() {
for (_uint i = 0; i &lt; CPlayer::PLAYER_END; ++i) {
Clear_Battle_Buff_Target((CPlayer::PLAYER_TYPE)i);
if (m_tBuff_Team.iMaxHp &gt; 0) { PLAYERMANAGER-&gt;Add_MaxHP((CPlayer::PLAYER_TYPE)i, -(_int)m_tBuff_Team.iMaxHp); }
}

	memset(&amp;m_tBuff_Team, 0, sizeof(BUFF_INFO));
}

HRESULT CBuff_Manager::Update(const _float&amp; fTimeDelta) {
const _float fCalcTimeDelta = fTimeDelta * m_pGameInstance-&gt;Get_GlobalTimeScale();

	if (m_tBuff_Food.fTimeAcc &gt; 0.f) { m_tBuff_Food.fTimeAcc -= fCalcTimeDelta; if (m_tBuff_Food.fTimeAcc &lt; 0.f) { Calc_Buff_Total(); } }
	if (m_tBuff_Team.fTimeAcc &gt; 0.f) { m_tBuff_Team.fTimeAcc -= fCalcTimeDelta; if (m_tBuff_Team.fTimeAcc &lt; 0.f) { Calc_Buff_Total(); } }
	for (_uint i = 0; i &lt; CPlayer::PLAYER_END; ++i) { if (m_tBuff_Personal[i].fTimeAcc &gt; 0.f) { m_tBuff_Personal[i].fTimeAcc -= fCalcTimeDelta; if (m_tBuff_Personal[i].fTimeAcc &lt; 0.f) { ZeroMemory(&amp;m_tBuff_Personal[i], sizeof(BUFF_INFO)); Calc_Buff_Total(); } } }

	return S_OK;
}

HRESULT CBuff_Manager::Initialize_Buff_Manager() {
m_pGameInstance = CGameInstance::GetInstance();
Safe_AddRef(m_pGameInstance);

	return S_OK;
}

void CBuff_Manager::Free() {
Safe_Release(m_pGameInstance);
}

HRESULT CBuff_Manager::Calc_Buff_Total() {
for (_uint i = 0; i &lt; CPlayer::PLAYER_END; ++i) {
if (m_tBuff_Total[i].iMaxHp &gt; 0) { PLAYERMANAGER-&gt;Add_MaxHP((CPlayer::PLAYER_TYPE)i, -(_int)m_tBuff_Total[i].iMaxHp); }

		if (m_tBuff_Food.fTimeAcc &lt;= 0.f) { ZeroMemory(&amp;m_tBuff_Food, sizeof(BUFF_INFO)); }
		if (m_tBuff_Team.fTimeAcc &lt;= 0.f) { ZeroMemory(&amp;m_tBuff_Team, sizeof(BUFF_INFO)); }

		m_tBuff_Total[i].iMaxHp = m_tBuff_Food.iMaxHp + m_tBuff_Team.iMaxHp + m_tBuff_Personal[i].iMaxHp + m_tBuff_Weapon[i].iMaxHp + m_tBuff_Armor[i].iMaxHp + m_tBuff_Accessory[i].iMaxHp;
		m_tBuff_Total[i].iDamage = m_tBuff_Food.iDamage + m_tBuff_Team.iDamage + m_tBuff_Personal[i].iDamage + m_tBuff_Weapon[i].iDamage + m_tBuff_Armor[i].iDamage + m_tBuff_Accessory[i].iDamage;
		m_tBuff_Total[i].iDefense = m_tBuff_Food.iDefense + m_tBuff_Team.iDefense + m_tBuff_Personal[i].iDefense + m_tBuff_Weapon[i].iDefense + m_tBuff_Armor[i].iDefense + m_tBuff_Accessory[i].iDefense;
		m_tBuff_Total[i].iPenetration = m_tBuff_Food.iPenetration + m_tBuff_Team.iPenetration + m_tBuff_Personal[i].iPenetration + m_tBuff_Weapon[i].iPenetration + m_tBuff_Armor[i].iPenetration + m_tBuff_Accessory[i].iPenetration;

		if (m_tBuff_Total[i].iMaxHp &gt; 0) { PLAYERMANAGER-&gt;Add_MaxHP((CPlayer::PLAYER_TYPE)i, m_tBuff_Total[i].iMaxHp); }
	}

	return S_OK;
}</code></pre>
</details>

## 사운드 매니저

FMOD 기반 사운드 매니저입니다.
Master 아래에 BGM·Voice·SFX를 두고, SFX 아래에 다시 UI·게임·캐릭터별(SFX_ALPEN, SFX_SHIONNE 등) 하위 그룹을 두는 계층형 채널 그룹으로 구성해, 그룹 단위로 볼륨·음소거·일시정지를 제어할 수 있게 했습니다.

<details class="code-block">
<summary>Sound_Manager.h <span class="file-badge">사운드 매니저 클래스 구조</span></summary>
<pre markdown="0"><code class="language-cpp">#include "Base.h"
#include "Engine_Defines.h"
#include &lt;codecvt&gt;

BEGIN(Engine)

class CSound_Manager final : public CBase {
public:
enum SOUNDGROUP {
MASTER,
BGM,
VOICE,
SFX,
SFX_UI,
SFX_GAME,
SFX_GAME_SUB,
SFX_ALPEN,
SFX_SHIONNE,
SFX_LINWELL,
SFX_LAW,
MAX_GROUPS
};
struct Group {
ChannelGroup* pGroup = {nullptr};
_bool isMuted = {false};
_bool isPaused = {false};
float fVolume = {1.f};
};

    struct SoundChannelInfo {
        Channel* pChannel = { nullptr };
        _tchar szSoundKey[MAX_PATH] = { L"" };
        _float fDuration = { 0.f };
        _float fTimeAcc = { 0.f };
    };

private:
CSound_Manager() = default;
virtual ~CSound_Manager() = default;

public:
void Update_Sound_Manager(const _float&amp; fTimeDelta);

public:
HRESULT CheckDuplication_PlaySound(CHANNELID eID, const _tchar* pSoundKey, const _float&amp; fVolume, const _float3* pPos = nullptr);
_bool isPlay(CHANNELID eID, const _tchar* pSoundKey);
_bool isPlayAnySound();
_uint Get_Position(CHANNELID eID, const _tchar* pSoundKey);
HRESULT Play(CHANNELID eID, const _tchar* pSoundKey, const _float&amp; fVolume, const _float3* pPos = nullptr, const _uint&amp; iPosition = 0, const _float&amp; fMaxDist = SOUND_MAX_DISTANCE);
HRESULT PlayWithDuration(CHANNELID eID, const _tchar* pSoundKey, const _float&amp; fVolume, const _float&amp; fDuration = 1.f, const _bool&amp; bLoop = false, const _float3* pPos = nullptr, const _float&amp; fMaxDist = SOUND_MAX_DISTANCE);
HRESULT Stop(CHANNELID eID);
HRESULT Stop(CHANNELID eID, const _tchar* pSoundKey);
HRESULT StopLoop(CHANNELID eID);
HRESULT StopAll();

public:
HRESULT Set_Volume(CHANNELID eID, const _float&amp; fVolume);
HRESULT Load_SoundFile(const _tchar* pSoundKey, const _tchar* pSoundFile, const _bool&amp; is3D = false);
HRESULT Load_SoundFolder(const _tchar* pSoundFolder, const _tchar* pExtension, const _bool&amp; is3D = false);
HRESULT Set_Listener(const _float3&amp; vPos, const _float3&amp; vLook, const _float3&amp; vUp, const _float3&amp; vVelocity = _float3(0.f, 0.f, 0.f));

public:
HRESULT Pause_Group(const SOUNDGROUP&amp; eGroup);
HRESULT Resume_Group(const SOUNDGROUP&amp; eGroup);
HRESULT Mute_Group(const SOUNDGROUP&amp; eGroup, const _bool&amp; isMuted);
HRESULT Set_Group_Volume(const SOUNDGROUP&amp; eGroup, const _float&amp; fVolume);
HRESULT Set_Pitch(const SOUNDGROUP&amp; eGroup, const _float&amp; fPitch);

public:
static CSound_Manager* Create();
virtual void Free() override;

private:
HRESULT Initialize_Sound_Manager();

private:
Sound* Find_Sound(const _tchar* pSoundKey);
void Find_SoundGroup(const CHANNELID&amp; eID, _Out_ _uint&amp; iIndex);

private:
map&lt;const _wstring, Sound*&gt; m_Sounds;
Channel* m_pChannels[MAX_CHANNEL] = {nullptr};
System* m_pSystem = {nullptr};

    Group m_SoundGroups[MAX_GROUPS] = {};

    _float3 m_ChannelPos[MAX_CHANNEL] = {_float3(0.f, 0.f, 0.f)};

    wstring_convert&lt;codecvt_utf8_utf16&lt;_tchar&gt;&gt; m_Converter;

    vector&lt;SoundChannelInfo&gt; m_PlayingSounds;
};

END</code></pre>
</details>

`Initialize_Sound_Manager`는 채널 그룹들을 생성하고 `addGroup`으로 계층을 연결합니다.
`Load_SoundFolder`는 폴더를 재귀 순회하며 확장자가 일치하는 파일을 로드하고, 2D/3D 여부에 따라 태그에 접미사(`_2D` / `_3D`)를 붙여 사운드 키로 등록합니다.
`Play`는 사운드를 재생하면서 위치 정보가 있으면 3D 감쇠(min/max distance)를 설정하고, BGM이면 루프 모드로 재생합니다.
`PlayWithDuration`은 지정한 지속시간이 지나면 자동으로 멈추도록 재생 중인 채널을 `m_PlayingSounds`로 추적하며, `Update_Sound_Manager`가 매 프레임 누적 시간을 확인해 만료된 채널을 정지·제거합니다.
`CheckDuplication_PlaySound`는 같은 사운드가 이미 재생 중이면 중복 재생하지 않도록 그룹 내 채널을 검사합니다.

<details class="code-block">
<summary>Sound_Manager.cpp <span class="file-badge">FMOD 사운드 매니저 구현</span></summary>
<pre markdown="0"><code class="language-cpp">#include "Sound_Manager.h"
#include &lt;iostream&gt;

void CSound_Manager::Update_Sound_Manager(const _float&amp; fTimeDelta) {
for (auto iter = m_PlayingSounds.begin(); iter != m_PlayingSounds.end(); ) {
(*iter).fTimeAcc += fTimeDelta;

        if ((*iter).fTimeAcc &gt;= (*iter).fDuration) {
            _bool isPlaying = { false };
            (*iter).pChannel-&gt;isPlaying(&amp;isPlaying);
            if (isPlaying) { (*iter).pChannel-&gt;stop(); }
            iter = m_PlayingSounds.erase(iter);
        }
        else { ++iter; }
    }

    m_pSystem-&gt;update();
}

HRESULT CSound_Manager::CheckDuplication_PlaySound(CHANNELID eID, const _tchar* pSoundKey, const _float&amp; fVolume, const _float3* pPos) {
m_pSystem-&gt;update();

    Sound* pSound = Find_Sound(pSoundKey);
    NULL_CHECK_RETURN(pSound, E_FAIL);

    _uint iIndex = {0};
    Find_SoundGroup(eID, iIndex);

    _int iNumChannels{};
    m_SoundGroups[iIndex].pGroup-&gt;getNumChannels(&amp;iNumChannels);

    for (int i = 0; i &lt; iNumChannels; ++i) {
        Channel* pChannel = nullptr;
        m_SoundGroups[iIndex].pGroup-&gt;getChannel(i, &amp;pChannel);

        Sound* currentSound = nullptr;
        pChannel-&gt;getCurrentSound(&amp;currentSound);

        if (currentSound == pSound) {
            return S_OK;
        }
    }

    Play(eID, pSoundKey, fVolume, pPos);

    return S_OK;
}

_bool CSound_Manager::isPlay(CHANNELID eID, const _tchar* pSoundKey) {
m_pSystem-&gt;update();

    Sound* pSound = Find_Sound(pSoundKey);
    if (pSound == nullptr)
        return false;

    _uint iIndex = {0};
    Find_SoundGroup(eID, iIndex);

    _int iNumChannels{};
    m_SoundGroups[iIndex].pGroup-&gt;getNumChannels(&amp;iNumChannels);

    for (int i = 0; i &lt; iNumChannels; ++i) {
        Channel* pChannel = nullptr;
        m_SoundGroups[iIndex].pGroup-&gt;getChannel(i, &amp;pChannel);

        Sound* currentSound = nullptr;
        pChannel-&gt;getCurrentSound(&amp;currentSound);

        if (currentSound == pSound) {
            return true;
        }
    }

    return false;
}

_bool CSound_Manager::isPlayAnySound() {
m_pSystem-&gt;update();

    for (_uint i = 0; i &lt; MAX_CHANNEL; ++i) {
        _uint iIndex = {0};
        Find_SoundGroup((CHANNELID)i, iIndex);

        _int iNumChannels{};
        m_SoundGroups[iIndex].pGroup-&gt;getNumChannels(&amp;iNumChannels);

        if (iNumChannels)
            return true;
    }

    return false;
}

_uint CSound_Manager::Get_Position(CHANNELID eID, const _tchar* pSoundKey) {
m_pSystem-&gt;update();

    Sound* pSound = Find_Sound(pSoundKey);
    if (!pSound)
        return 0;

    _uint iIndex = {0};
    Find_SoundGroup(eID, iIndex);

    _int iNumChannels{};
    m_SoundGroups[iIndex].pGroup-&gt;getNumChannels(&amp;iNumChannels);

    for (int i = 0; i &lt; iNumChannels; ++i) {
        Channel* pChannel = nullptr;
        m_SoundGroups[iIndex].pGroup-&gt;getChannel(i, &amp;pChannel);

        Sound* currentSound = nullptr;
        pChannel-&gt;getCurrentSound(&amp;currentSound);

        if (currentSound == pSound) {
            _uint position = 0;
            pChannel-&gt;getPosition(&amp;position, FMOD_TIMEUNIT_MS);
            return position;
        }
    }

    return 0;   
}

HRESULT CSound_Manager::Play(CHANNELID eID, const _tchar* pSoundKey, const _float&amp; fVolume, const _float3* pPos, const _uint&amp; iPosition, const _float&amp; fMaxDist) {
Sound* pSound = Find_Sound(pSoundKey);
NULL_CHECK_RETURN(pSound, E_FAIL);

    // 사운드 재생 (Paused 상태로 시작하여 속성 세팅 후 재생)
    m_pSystem-&gt;playSound(pSound, nullptr, false, &amp;m_pChannels[eID]);
    if (iPosition) {
        m_pChannels[eID]-&gt;setPosition(iPosition, FMOD_TIMEUNIT_MS);
    }

    // 3D 사운드 처리 (위치 정보가 있을 경우)
    if (pPos) {
        m_ChannelPos[eID] = *pPos;
        // 3D 위치 및 속도 설정
        m_pChannels[eID]-&gt;set3DAttributes(reinterpret_cast&lt;const FMOD_VECTOR*&gt;(&amp;m_ChannelPos[eID]), nullptr);

        float fMinDist = 3.f;

        // 거리 감쇠 설정
        m_pChannels[eID]-&gt;set3DMinMaxDistance(fMinDist, fMaxDist);
        m_pChannels[eID]-&gt;set3DConeSettings(360.f, 360.f, 1.0f); // 모든 방향에서 소리 발생, 외부에서도 감쇠 없이 소리 유지
    }
    if (eID == SOUND_BGM) {
        m_pChannels[eID]-&gt;setMode(FMOD_LOOP_NORMAL);
    }
    else {
        m_pChannels[eID]-&gt;setChannelGroup(m_SoundGroups[SFX].pGroup);
    }

    // 채널 그룹 할당 및 볼륨 설정
    _uint iIndex = {0};

    Find_SoundGroup(eID, iIndex);

    m_pChannels[eID]-&gt;setVolume(fVolume);
    m_pChannels[eID]-&gt;setChannelGroup(m_SoundGroups[iIndex].pGroup);
    m_pSystem-&gt;update();

    return S_OK;
}

HRESULT CSound_Manager::PlayWithDuration(CHANNELID eID, const _tchar* pSoundKey, const _float&amp; fVolume, const _float&amp; fDuration, const _bool&amp; bLoop, const _float3* pPos, const _float&amp; fMaxDist) {
FAILED_CHECK_RETURN(Play(eID, pSoundKey, fVolume, pPos, 0, fMaxDist), E_FAIL);

    if (bLoop) { m_pChannels[eID]-&gt;setMode(FMOD_LOOP_NORMAL); }
    else { m_pChannels[eID]-&gt;setMode(FMOD_LOOP_OFF); }

    if (fDuration &gt; 0.f) {
        SoundChannelInfo SoundInfo = { };
        SoundInfo.pChannel = m_pChannels[eID];
        wcsncpy_s(SoundInfo.szSoundKey, pSoundKey, MAX_PATH);
        SoundInfo.fDuration = fDuration;

        m_PlayingSounds.push_back(SoundInfo);
    }

    return S_OK;
}

HRESULT CSound_Manager::Stop(CHANNELID eID) {
m_pChannels[eID]-&gt;stop();

    return S_OK;
}

HRESULT CSound_Manager::Stop(CHANNELID eID, const _tchar* pSoundKey) {
Sound* pSound = Find_Sound(pSoundKey);
if (!pSound) { return E_FAIL; }

    _uint iIndex = { 0 };
    Find_SoundGroup(eID, iIndex);

    _int iNumChannels = { 0 };
    m_SoundGroups[iIndex].pGroup-&gt;getNumChannels(&amp;iNumChannels);

    for (_uint i = 0; i &lt; iNumChannels; ++i) {
        Channel* pChannel = { nullptr };
        m_SoundGroups[iIndex].pGroup-&gt;getChannel(i, &amp;pChannel);

        Sound* pCurrentSound = { nullptr };
        pChannel-&gt;getCurrentSound(&amp;pCurrentSound);

        if (pCurrentSound == pSound) {
            pChannel-&gt;stop();
            return S_OK;
        }
    }

    return E_FAIL;
}

HRESULT CSound_Manager::StopLoop(CHANNELID eID) {
NULL_CHECK_RETURN(m_SoundGroups[eID].pGroup, E_FAIL);

    int iNumChannels = 0;
    m_SoundGroups[eID].pGroup-&gt;getNumChannels(&amp;iNumChannels);

    for (int i = 0; i &lt; iNumChannels; ++i) {
        Channel* pChannel = { nullptr };
        m_SoundGroups[eID].pGroup-&gt;getChannel(i, &amp;pChannel);

        if (!pChannel) { continue; }

        FMOD_MODE mode = { };
        pChannel-&gt;getMode(&amp;mode);

        if (mode &amp; FMOD_LOOP_NORMAL) {
            pChannel-&gt;stop();

            for (auto iter = m_PlayingSounds.begin(); iter != m_PlayingSounds.end(); ) {
                if (iter-&gt;pChannel == pChannel) { iter = m_PlayingSounds.erase(iter); }
                else { ++iter; }
            }
        }
    }

    return S_OK;
}

HRESULT CSound_Manager::StopAll() {
for (_uint i = 0; i &lt; MAX_CHANNEL; ++i) {
m_pChannels[i]-&gt;stop();
}

    return S_OK;
}

HRESULT CSound_Manager::Set_Volume(CHANNELID eID, const _float&amp; fVolume) {
m_pChannels[eID]-&gt;setVolume(fVolume);
m_pSystem-&gt;update();

    return S_OK;
}

HRESULT CSound_Manager::Load_SoundFile(const _tchar* pSoundKey, const _tchar* pSoundFile, const _bool&amp; is3D) {
Sound* pSound = {nullptr};
FMOD_MODE iMode = is3D ? (FMOD_3D | FMOD_3D_LINEARROLLOFF) : FMOD_DEFAULT;

    FMOD_RESULT eRes = m_pSystem-&gt;createSound(m_Converter.to_bytes(pSoundFile).c_str(), iMode, nullptr, &amp;pSound);
    if (eRes == FMOD_OK) {
        m_Sounds.emplace(pSoundKey, pSound);
    }
    else {
        wcout &lt;&lt; pSoundKey &lt;&lt; endl;
        return E_FAIL;
    }

    m_pSystem-&gt;update();

    return S_OK;
}

HRESULT CSound_Manager::Load_SoundFolder(const _tchar* pSoundFolder, const _tchar* pExtension, const _bool&amp; is3D) {
WIN32_FIND_DATA FindFileData = {};
HANDLE hFind = FindFirstFile((_wstring(pSoundFolder) + L"/*").c_str(), &amp;FindFileData);

    if (hFind == INVALID_HANDLE_VALUE) {
        MSG_BOX("Failed to Open Directory");
        return E_FAIL;
    }

    do {
        _wstring strFileName = FindFileData.cFileName;

        if (strFileName == L"." || strFileName == L"..") {
            continue;
        }

        _wstring strFullPath = pSoundFolder;
        if (strFullPath.back() != L'/') {
            strFullPath += L'/';
        }
        strFullPath += strFileName;

        if (FindFileData.dwFileAttributes &amp; FILE_ATTRIBUTE_DIRECTORY) {
            Load_SoundFolder(strFullPath.c_str(), pExtension, is3D);
        }
        else {
            _tchar szExtension[_MAX_EXT] = L"";
            _tchar szTag[MAX_PATH] = L"";
            _wsplitpath_s(strFileName.c_str(), nullptr, 0, nullptr, 0, szTag, MAX_PATH, szExtension, _MAX_EXT);

            if (!is3D) {
                lstrcat(szTag, L"_2D");
            }
            else {
                lstrcat(szTag, L"_3D");
            }

            if (_wcsicmp(szExtension, pExtension) == 0) {
                Load_SoundFile(szTag, strFullPath.c_str(), is3D);
            }
        }

    } while (FindNextFile(hFind, &amp;FindFileData) != 0);

    FindClose(hFind);

    return S_OK;
}

HRESULT CSound_Manager::Set_Listener(const _float3&amp; vPos, const _float3&amp; vLook, const _float3&amp; vUp, const _float3&amp; vVelocity) {
// 엔진의 Vector3를 FMOD_VECTOR로 캐스팅
FMOD_VECTOR Position = *reinterpret_cast&lt;const FMOD_VECTOR*&gt;(&amp;vPos);
FMOD_VECTOR Forward = *reinterpret_cast&lt;const FMOD_VECTOR*&gt;(&amp;vLook);
FMOD_VECTOR Up = *reinterpret_cast&lt;const FMOD_VECTOR*&gt;(&amp;vUp);
FMOD_VECTOR Velocity = *reinterpret_cast&lt;const FMOD_VECTOR*&gt;(&amp;vVelocity);

    // 3D 리스너 속성 업데이트
    m_pSystem-&gt;set3DListenerAttributes(0, &amp;Position, &amp;Velocity, &amp;Forward, &amp;Up);
    m_pSystem-&gt;update();

    return S_OK;
}

HRESULT CSound_Manager::Pause_Group(const SOUNDGROUP&amp; eGroup) {
if (m_SoundGroups[eGroup].pGroup) {
m_SoundGroups[eGroup].pGroup-&gt;setPaused(true);
}

    return S_OK;
}

HRESULT CSound_Manager::Resume_Group(const SOUNDGROUP&amp; eGroup) {
if (m_SoundGroups[eGroup].pGroup) {
m_SoundGroups[eGroup].pGroup-&gt;setPaused(false);
}

    return S_OK;
}

HRESULT CSound_Manager::Mute_Group(const SOUNDGROUP&amp; eGroup, const _bool&amp; isMuted) {
m_SoundGroups[eGroup].isMuted = isMuted;
if (m_SoundGroups[eGroup].pGroup) {
m_SoundGroups[eGroup].pGroup-&gt;setMute(isMuted);
}

    return S_OK;
}

HRESULT CSound_Manager::Set_Group_Volume(const SOUNDGROUP&amp; eGroup, const _float&amp; fVolume) {
m_SoundGroups[eGroup].fVolume = fVolume;
if (m_SoundGroups[eGroup].pGroup) {
m_SoundGroups[eGroup].pGroup-&gt;setVolume(fVolume);
}

    return S_OK;
}

HRESULT CSound_Manager::Set_Pitch(const SOUNDGROUP&amp; eGroup, const _float&amp; fPitch) {
if (m_SoundGroups[eGroup].pGroup) { m_SoundGroups[eGroup].pGroup-&gt;setPitch(fPitch); }

    return S_OK;
}

CSound_Manager* CSound_Manager::Create() {
CSound_Manager* pInstance = new CSound_Manager();

    if (FAILED(pInstance-&gt;Initialize_Sound_Manager())) {
        MSG_BOX("Failed to Create : CSound_Manager");
        Safe_Release(pInstance);
    }

    return pInstance;
}

void CSound_Manager::Free() {
m_PlayingSounds.clear();

    for (auto&amp; MyPair : m_Sounds) {
        if (MyPair.second) {
            MyPair.second-&gt;release();
            MyPair.second = nullptr;
        }
    }
    m_Sounds.clear();

    m_pSystem-&gt;release();
}

HRESULT CSound_Manager::Initialize_Sound_Manager() {
System_Create(&amp;m_pSystem, FMOD_VERSION);
m_pSystem-&gt;init(512, FMOD_INIT_NORMAL, NULL);

    // 그룹 생성 (Master, BGM, SFX, Voice 등)
    m_pSystem-&gt;createChannelGroup("Master", &amp;m_SoundGroups[MASTER].pGroup);

    m_pSystem-&gt;createChannelGroup("BGM", &amp;m_SoundGroups[BGM].pGroup);
    m_pSystem-&gt;createChannelGroup("Voice", &amp;m_SoundGroups[VOICE].pGroup);
    m_pSystem-&gt;createChannelGroup("SFX", &amp;m_SoundGroups[SFX].pGroup);

    // 효과음 하위 그룹 생성
    m_pSystem-&gt;createChannelGroup("UI", &amp;m_SoundGroups[SFX_UI].pGroup);
    m_pSystem-&gt;createChannelGroup("GAME", &amp;m_SoundGroups[SFX_GAME].pGroup);
    m_pSystem-&gt;createChannelGroup("SUBGAME", &amp;m_SoundGroups[SFX_GAME_SUB].pGroup);

    // 캐릭터별 하위 그룹 생성
    m_pSystem-&gt;createChannelGroup("SFX_ALPEN", &amp;m_SoundGroups[SFX_ALPEN].pGroup);
    m_pSystem-&gt;createChannelGroup("SFX_SHIONNE", &amp;m_SoundGroups[SFX_SHIONNE].pGroup);
    m_pSystem-&gt;createChannelGroup("SFX_LINWELL", &amp;m_SoundGroups[SFX_LINWELL].pGroup);
    m_pSystem-&gt;createChannelGroup("SFX_LAW", &amp;m_SoundGroups[SFX_LAW].pGroup);

    // 계층 연결
    m_SoundGroups[SFX_GAME].pGroup-&gt;addGroup(m_SoundGroups[SFX_ALPEN].pGroup);
    m_SoundGroups[SFX_GAME].pGroup-&gt;addGroup(m_SoundGroups[SFX_SHIONNE].pGroup);
    m_SoundGroups[SFX_GAME].pGroup-&gt;addGroup(m_SoundGroups[SFX_LINWELL].pGroup);
    m_SoundGroups[SFX_GAME].pGroup-&gt;addGroup(m_SoundGroups[SFX_LAW].pGroup);

    m_SoundGroups[SFX].pGroup-&gt;addGroup(m_SoundGroups[SFX_UI].pGroup);
    m_SoundGroups[SFX].pGroup-&gt;addGroup(m_SoundGroups[SFX_GAME].pGroup);
    m_SoundGroups[SFX].pGroup-&gt;addGroup(m_SoundGroups[SFX_GAME_SUB].pGroup);

    m_SoundGroups[MASTER].pGroup-&gt;addGroup(m_SoundGroups[BGM].pGroup);
    m_SoundGroups[MASTER].pGroup-&gt;addGroup(m_SoundGroups[VOICE].pGroup);
    m_SoundGroups[MASTER].pGroup-&gt;addGroup(m_SoundGroups[SFX].pGroup);

    return S_OK;
}

Sound* CSound_Manager::Find_Sound(const _tchar* pSoundKey) {
auto iter = m_Sounds.find(pSoundKey);

    if (iter == m_Sounds.end()) {
        return nullptr;
    }

    return iter-&gt;second;
}

void CSound_Manager::Find_SoundGroup(const CHANNELID&amp; eID, _uint&amp; iIndex) {
switch (eID) {
case SOUND_BGM:
iIndex = BGM;
break;

        case SOUND_VOICE:
            iIndex = VOICE;
            break;

        case SOUND_UI:
            iIndex = SFX_UI;
            break;

        case SOUND_GAME:
            iIndex = SFX_GAME;
            break;

        case SOUND_ALPEN:
            iIndex = SFX_ALPEN;
            break;

        case SOUND_SHIONNE:
            iIndex = SFX_SHIONNE;
            break;

        case SOUND_LINWELL:
            iIndex = SFX_LINWELL;
            break;

        case SOUND_LAW:
            iIndex = SFX_LAW;
            break;

        case SOUND_SUBGAME:
            iIndex = SFX_GAME_SUB;
            break;
    }
}</code></pre>
</details>