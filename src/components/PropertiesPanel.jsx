import React from 'react';
import useEditorStore from '../stores/editorStore';

export default function PropertiesPanel() {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const elements = useEditorStore((s) => s.elements);
  const updateElement = useEditorStore((s) => s.updateElement);

  if (selectedIds.length === 0) {
    return (
      <>
        <div className="panel-header"><span>Properties</span></div>
        <div className="empty-message">Select an element to edit its properties.</div>
      </>
    );
  }

  // Show properties for first selected element
  const el = elements.find((e) => e.id === selectedIds[0]);
  if (!el) return null;

  const set = (key, value) => updateElement(el.id, { [key]: value });
  const setNum = (key, e) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) set(key, v);
  };

  const isText = el.type === 'text';

  return (
    <>
      <div className="panel-header"><span>Properties</span></div>

      {/* Transform */}
      <div className="prop-section">
        <div className="prop-section-title">Transform</div>
        <div className="prop-row">
          <label>X</label>
          <input type="number" value={Math.round(el.x)} onChange={(e) => setNum('x', e)} />
          <label>Y</label>
          <input type="number" value={Math.round(el.y)} onChange={(e) => setNum('y', e)} />
        </div>
        {!isText && (
          <div className="prop-row">
            <label>W</label>
            <input type="number" value={Math.round(el.w)} onChange={(e) => setNum('w', e)} />
            <label>H</label>
            <input type="number" value={Math.round(el.h)} onChange={(e) => setNum('h', e)} />
          </div>
        )}
        <div className="prop-row">
          <label>Rot</label>
          <input type="number" value={Math.round(el.rotation || 0)} onChange={(e) => setNum('rotation', e)} step="1" />
        </div>
      </div>

      {/* Text Properties */}
      {isText && <TextSection el={el} set={set} />}

      {/* Nine-Slice (images only) */}
      {!isText && (
        <div className="prop-section">
          <div className="prop-section-title">Nine-Slice</div>
          <div className="prop-row">
            <label style={{ width: 'auto' }}>
              <input
                type="checkbox"
                checked={!!el.nineSlice}
                onChange={(e) => {
                  if (e.target.checked) {
                    set('nineSlice', { left: 8, right: 8, top: 8, bottom: 8 });
                  } else {
                    set('nineSlice', null);
                  }
                }}
              />
              {' '}Enable 9-slice
            </label>
          </div>
          {el.nineSlice && (
            <>
              <div className="prop-row">
                <label>L</label>
                <input type="number" value={el.nineSlice.left} onChange={(e) => set('nineSlice', { ...el.nineSlice, left: parseInt(e.target.value) || 0 })} />
                <label>R</label>
                <input type="number" value={el.nineSlice.right} onChange={(e) => set('nineSlice', { ...el.nineSlice, right: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="prop-row">
                <label>T</label>
                <input type="number" value={el.nineSlice.top} onChange={(e) => set('nineSlice', { ...el.nineSlice, top: parseInt(e.target.value) || 0 })} />
                <label>B</label>
                <input type="number" value={el.nineSlice.bottom} onChange={(e) => set('nineSlice', { ...el.nineSlice, bottom: parseInt(e.target.value) || 0 })} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Interaction */}
      <div className="prop-section">
        <div className="prop-section-title">Interaction</div>
        <div className="prop-row">
          <label style={{ width: 'auto' }}>
            <input
              type="checkbox"
              checked={!!el.interactive}
              onChange={(e) => set('interactive', e.target.checked)}
            />
            {' '}Interactive
          </label>
        </div>
        {el.interactive && (
          <div className="prop-row">
            <label style={{ width: 'auto' }}>Trigger</label>
            <select
              value={el.interactionTrigger || 'hover'}
              onChange={(e) => set('interactionTrigger', e.target.value)}
            >
              <option value="hover">Hover</option>
              <option value="click">Click</option>
              <option value="both">Both</option>
            </select>
          </div>
        )}
      </div>

      {/* Animation */}
      <div className="prop-section">
        <div className="prop-section-title">Animation</div>
        <AnimationSection el={el} set={set} />
      </div>
    </>
  );
}

const FONT_FAMILIES = [
  'Arial', 'Verdana', 'Helvetica', 'Tahoma', 'Trebuchet MS',
  'Times New Roman', 'Georgia', 'Garamond',
  'Courier New', 'Lucida Console', 'Monaco',
  'Comic Sans MS', 'Impact',
];

function TextSection({ el, set }) {
  return (
    <div className="prop-section">
      <div className="prop-section-title">Text</div>
      <div className="prop-row" style={{ alignItems: 'flex-start' }}>
        <label style={{ paddingTop: 4 }}>Txt</label>
        <textarea
          className="prop-textarea"
          value={el.text || ''}
          onChange={(e) => set('text', e.target.value)}
          rows={2}
        />
      </div>
      <div className="prop-row">
        <label>Font</label>
        <select value={el.fontFamily || 'Arial'} onChange={(e) => set('fontFamily', e.target.value)}>
          {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div className="prop-row">
        <label>Size</label>
        <input type="number" value={el.fontSize || 24} min={1} onChange={(e) => {
          const v = parseInt(e.target.value);
          if (v > 0) set('fontSize', v);
        }} />
        <label>Style</label>
        <select value={el.fontStyle || ''} onChange={(e) => set('fontStyle', e.target.value)}>
          <option value="">Normal</option>
          <option value="bold">Bold</option>
          <option value="italic">Italic</option>
          <option value="bold italic">Bold Italic</option>
        </select>
      </div>
      <div className="prop-row">
        <label style={{ width: 'auto' }}>Color</label>
        <input type="color" className="prop-color" value={el.color || '#ffffff'} onChange={(e) => set('color', e.target.value)} />
        <label style={{ width: 'auto' }}>Align</label>
        <select value={el.align || 'left'} onChange={(e) => set('align', e.target.value)}>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
          <option value="justify">Justify</option>
        </select>
      </div>
      <div className="prop-row">
        <label style={{ width: 'auto' }}>Wrap W</label>
        <input type="number" value={el.wordWrapWidth || 0} min={0} onChange={(e) => set('wordWrapWidth', parseInt(e.target.value) || 0)} />
      </div>
      <div className="prop-section-title" style={{ marginTop: 6 }}>Stroke</div>
      <div className="prop-row">
        <label style={{ width: 'auto' }}>Color</label>
        <input type="color" className="prop-color" value={el.stroke || '#000000'} onChange={(e) => set('stroke', e.target.value)} />
        <label>Thk</label>
        <input type="number" value={el.strokeThickness || 0} min={0} onChange={(e) => set('strokeThickness', parseInt(e.target.value) || 0)} />
      </div>
      <div className="prop-section-title" style={{ marginTop: 6 }}>Spacing &amp; Padding</div>
      <div className="prop-row">
        <label>Line</label>
        <input type="number" value={el.lineSpacing || 0} onChange={(e) => set('lineSpacing', parseInt(e.target.value) || 0)} />
        <label>Ltr</label>
        <input type="number" value={el.letterSpacing || 0} onChange={(e) => set('letterSpacing', parseInt(e.target.value) || 0)} />
      </div>
      <div className="prop-row">
        <label>Pad</label>
        <input type="number" value={el.padding || 0} min={0} onChange={(e) => set('padding', parseInt(e.target.value) || 0)} />
      </div>
    </div>
  );
}

/* Animation sub-section */
function AnimationSection({ el, set }) {
  const anim = el.animation;

  return (
    <>
      <div className="prop-row">
        <label style={{ width: 'auto' }}>
          <input
            type="checkbox"
            checked={!!anim}
            onChange={(e) => {
              if (e.target.checked) {
                set('animation', {
                  type: 'slide',
                  trigger: 'hover-in',
                  config: { direction: 'left', distance: 100, duration: 300, ease: 'Power2' },
                });
              } else {
                set('animation', null);
              }
            }}
          />
          {' '}Enable Animation
        </label>
      </div>
      {anim && (
        <>
          <div className="prop-row">
            <label style={{ width: 'auto' }}>Type</label>
            <select value={anim.type} onChange={(e) => set('animation', { ...anim, type: e.target.value })}>
              <option value="slide">Slide</option>
            </select>
          </div>
          <div className="prop-row">
            <label style={{ width: 'auto' }}>Trigger</label>
            <select value={anim.trigger} onChange={(e) => set('animation', { ...anim, trigger: e.target.value })}>
              <option value="hover-in">Hover In</option>
              <option value="hover-out">Hover Out</option>
              <option value="click">Click</option>
            </select>
          </div>
          {anim.type === 'slide' && (
            <>
              <div className="prop-row">
                <label>Dir</label>
                <select value={anim.config.direction} onChange={(e) => set('animation', { ...anim, config: { ...anim.config, direction: e.target.value } })}>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="up">Up</option>
                  <option value="down">Down</option>
                </select>
              </div>
              <div className="prop-row">
                <label>Dist</label>
                <input type="number" value={anim.config.distance} onChange={(e) => set('animation', { ...anim, config: { ...anim.config, distance: parseInt(e.target.value) || 0 } })} />
              </div>
              <div className="prop-row">
                <label>Dur</label>
                <input type="number" value={anim.config.duration} onChange={(e) => set('animation', { ...anim, config: { ...anim.config, duration: parseInt(e.target.value) || 100 } })} />
              </div>
              <div className="prop-row">
                <label>Ease</label>
                <select value={anim.config.ease} onChange={(e) => set('animation', { ...anim, config: { ...anim.config, ease: e.target.value } })}>
                  <option value="Linear">Linear</option>
                  <option value="Power2">Power2</option>
                  <option value="Power3">Power3</option>
                  <option value="Bounce">Bounce</option>
                  <option value="Back">Back</option>
                  <option value="Elastic">Elastic</option>
                </select>
              </div>
            </>
          )}
          <div className="prop-row" style={{ marginTop: 4 }}>
            <button
              style={{ padding: '3px 10px', border: '1px solid var(--input-border)', borderRadius: 3, background: 'var(--input-bg)', color: 'var(--text)', cursor: 'pointer', fontSize: 11 }}
              onClick={() => {
                // Dispatch preview event to Phaser
                window.dispatchEvent(new CustomEvent('preview-animation', { detail: { elementId: el.id } }));
              }}
            >
              Preview
            </button>
          </div>
        </>
      )}
    </>
  );
}
