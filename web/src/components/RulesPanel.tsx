import { useState } from 'react';
import type { MaskRule, Preset } from '../types';
import { uid, validateContextRegex, validateRegex } from '../utils';

interface Props {
  rules: MaskRule[];
  presets: Preset[];
  onChange: (rules: MaskRule[]) => void;
}

export function RulesPanel({ rules, presets, onChange }: Props) {
  const [openId, setOpenId] = useState<string | null>(rules[0]?.id ?? null);

  const update = (id: string, patch: Partial<MaskRule>) =>
    onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => onChange(rules.filter((r) => r.id !== id));
  const addBlank = () => {
    const r: MaskRule = {
      id: uid(),
      name: '新规则',
      pattern: '',
      flags: 'g',
      replacement: '***',
      priority: 10,
      enabled: true,
      mode: 'template',
      aliasPrefix: '化名',
      crossCue: false,
      maxCueGapMs: 500,
      preContext: { pattern: '', chars: 20 },
      postContext: { pattern: '', chars: 20 },
    };
    onChange([...rules, r]);
    setOpenId(r.id);
  };
  const addPreset = (p: Preset) => {
    const r: MaskRule = { id: uid(), ...p.rule };
    onChange([...rules, r]);
    setOpenId(r.id);
  };

  const availablePresets = presets.filter(
    (p) => !rules.some((r) => r.name === p.rule.name && r.pattern === p.rule.pattern),
  );

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>② 脱敏规则</h2>
        <div className="panel-actions">
          <select
            className="preset-select"
            value=""
            onChange={(e) => {
              const p = presets.find((x) => x.name === e.target.value);
              if (p) addPreset(p);
            }}
          >
            <option value="">+ 添加预设…</option>
            {availablePresets.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
          <button className="btn" onClick={addBlank}>
            + 自定义规则
          </button>
        </div>
      </header>

      <p className="hint">
        数值越大优先级越高；重叠命中由高优先级（同优先级取更长匹配）吞并，被吞并项仅进入审计。
        模板替换支持 <code>$1</code>、<code>$&amp;</code>、<code>$KEEP:3</code>、
        <code>$MASKALL</code>、<code>$RULE</code>；切到「稳定化名」后同一实体跨 cue
        使用同一编号化名（NFKC 归一 + 去空白建键），增删字幕不重排编号，可在下方化名表改名。
        可为规则配置「上下文条件」：命中前 / 后若干字符内需匹配给定正则才脱敏，
        被条件过滤的命中不参与优先级吞并。
      </p>

      <ul className="rule-list">
        {rules.length === 0 && <li className="empty-tip">暂无规则，请从预设添加或自定义。</li>}
        {rules.map((r) => {
          const err = r.enabled ? validateRegex(r.pattern, r.flags) : null;
          const preCtxErr = r.enabled
            ? validateContextRegex(r.preContext.pattern, r.flags)
            : null;
          const postCtxErr = r.enabled
            ? validateContextRegex(r.postContext.pattern, r.flags)
            : null;
          const anyErr = err ?? preCtxErr ?? postCtxErr;
          const hasContext = !!(r.preContext.pattern || r.postContext.pattern);
          const open = openId === r.id;
          return (
            <li key={r.id} className={`rule-item ${r.enabled ? '' : 'disabled'}`}>
              <div className="rule-row">
                <input
                  type="checkbox"
                  checked={r.enabled}
                  onChange={(e) => update(r.id, { enabled: e.target.checked })}
                  title="启用 / 停用"
                />
                <button className="rule-name" onClick={() => setOpenId(open ? null : r.id)}>
                  <span className="pri-badge" title="优先级">
                    {r.priority}
                  </span>
                  {r.name}
                  {r.mode === 'alias' && (
                    <span className="mode-badge mode-alias" title="稳定化名模式">
                      化名
                    </span>
                  )}
                  {r.crossCue && (
                    <span
                      className="mode-badge mode-cross"
                      title={`跨 cue 连续扫描：相邻间隔 ≤ ${r.maxCueGapMs}ms 的字幕拼成扫描窗口`}
                    >
                      跨cue
                    </span>
                  )}
                  {hasContext && (
                    <span
                      className="mode-badge mode-context"
                      title="已配置上下文条件：命中前 / 后需满足给定语境才脱敏"
                    >
                      上下文
                    </span>
                  )}
                  {anyErr && <span className="rule-err-dot" title={anyErr}>!</span>}
                  <span className="caret">{open ? '▾' : '▸'}</span>
                </button>
                <button className="btn btn-mini btn-danger" onClick={() => remove(r.id)}>
                  删除
                </button>
              </div>
              {open && (
                <div className="rule-detail">
                  <label>
                    规则名称
                    <input
                      value={r.name}
                      onChange={(e) => update(r.id, { name: e.target.value })}
                    />
                  </label>
                  <label>
                    正则（不含 /）
                    <input
                      className="mono"
                      spellCheck={false}
                      value={r.pattern}
                      onChange={(e) => update(r.id, { pattern: e.target.value })}
                    />
                  </label>
                  {err && <div className="rule-err">正则无效：{err}</div>}
                  <div className="rule-grid">
                    <label>
                      标志
                      <input
                        className="mono"
                        value={r.flags}
                        onChange={(e) => update(r.id, { flags: e.target.value })}
                      />
                    </label>
                    <label>
                      优先级
                      <input
                        type="number"
                        value={r.priority}
                        onChange={(e) => update(r.id, { priority: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                  <div className="rule-mode">
                    <span className="field-label">替换模式</span>
                    <label className={`mode-option ${r.mode === 'template' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name={`mode-${r.id}`}
                        checked={r.mode === 'template'}
                        onChange={() => update(r.id, { mode: 'template' })}
                      />
                      固定模板
                    </label>
                    <label className={`mode-option ${r.mode === 'alias' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name={`mode-${r.id}`}
                        checked={r.mode === 'alias'}
                        onChange={() => update(r.id, { mode: 'alias' })}
                      />
                      稳定化名
                    </label>
                  </div>
                  {r.mode === 'alias' ? (
                    <label>
                      化名前缀（编号化名 = 前缀 + 序号，留空为「化名」）
                      <input
                        className="mono"
                        value={r.aliasPrefix}
                        placeholder="如：人物 / 机构 / 地点"
                        onChange={(e) => update(r.id, { aliasPrefix: e.target.value })}
                      />
                    </label>
                  ) : (
                    <label>
                      替换模板
                      <input
                        className="mono"
                        value={r.replacement}
                        onChange={(e) => update(r.id, { replacement: e.target.value })}
                      />
                    </label>
                  )}
                  <div className="rule-cross">
                    <label className={`mode-option ${r.crossCue ? 'active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={r.crossCue}
                        onChange={(e) => update(r.id, { crossCue: e.target.checked })}
                      />
                      跨 cue 连续扫描
                    </label>
                    {r.crossCue && (
                      <label className="rule-cross-gap">
                        最大间隔（毫秒）
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={r.maxCueGapMs}
                          onChange={(e) =>
                            update(r.id, { maxCueGapMs: Number(e.target.value) })
                          }
                        />
                      </label>
                    )}
                  </div>
                  {r.crossCue && (
                    <p className="hint rule-cross-hint">
                      开启后：间隔不超过 {r.maxCueGapMs}ms 的相邻字幕会拼成扫描窗口，
                      被两条字幕断开的敏感串也能命中；替换文本写入首条字幕，
                      后续字幕中被覆盖的字符删除（时间轴与各 cue 标识保持原样）。
                    </p>
                  )}
                  <div className="rule-context">
                    <span className="field-label">
                      上下文条件（正则留空 = 该侧不限制；在扫描窗口内取命中前 / 后若干字符检索）
                    </span>
                    <div className="rule-grid">
                      <label>
                        命中前上下文正则
                        <input
                          className="mono"
                          spellCheck={false}
                          value={r.preContext.pattern}
                          placeholder="如：手机|电话|联系方式"
                          onChange={(e) =>
                            update(r.id, {
                              preContext: { ...r.preContext, pattern: e.target.value },
                            })
                          }
                        />
                      </label>
                      <label>
                        命中前检查字符数
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={r.preContext.chars}
                          onChange={(e) =>
                            update(r.id, {
                              preContext: {
                                ...r.preContext,
                                chars: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </label>
                    </div>
                    {preCtxErr && (
                      <div className="rule-err">命中前上下文正则无效：{preCtxErr}</div>
                    )}
                    <div className="rule-grid">
                      <label>
                        命中后上下文正则
                        <input
                          className="mono"
                          spellCheck={false}
                          value={r.postContext.pattern}
                          placeholder="如：结束|完毕"
                          onChange={(e) =>
                            update(r.id, {
                              postContext: { ...r.postContext, pattern: e.target.value },
                            })
                          }
                        />
                      </label>
                      <label>
                        命中后检查字符数
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={r.postContext.chars}
                          onChange={(e) =>
                            update(r.id, {
                              postContext: {
                                ...r.postContext,
                                chars: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </label>
                    </div>
                    {postCtxErr && (
                      <div className="rule-err">命中后上下文正则无效：{postCtxErr}</div>
                    )}
                    {hasContext && (
                      <p className="hint rule-context-hint">
                        仅当命中前 {r.preContext.chars} 字符 / 命中后 {r.postContext.chars}{' '}
                        字符内的窗口文本满足对应正则时才脱敏（留空的一侧不限制）；
                        被条件过滤的命中不进入优先级吞并，过滤计数显示在预览统计与导出审计中。
                      </p>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
