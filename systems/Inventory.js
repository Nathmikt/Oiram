export class Inventory {
  constructor() {
    this.abilities = new Map();
    this.equipped = new Set();
  }

  async init() {
    try {
      const response = await fetch('./data/abilities.json?t=' + Date.now());
      const data = await response.json();
      for (const item of data) {
        this.abilities.set(item.id, item);
      }
      this.equip('sprint');
      this.equip('wall_climb');
      this.equip('swim');
      this.equip('dig');
      this.renderUI();
    } catch (e) {
      console.warn('Could not load abilities.json', e);
    }
  }

  equip(abilityId) {
    if (this.abilities.has(abilityId)) {
      this.equipped.add(abilityId);
      this.renderUI();
    }
  }

  unequip(abilityId) {
    this.equipped.delete(abilityId);
    this.renderUI();
  }

  toggle(abilityId) {
    if (this.isEquipped(abilityId)) {
      this.unequip(abilityId);
    } else {
      this.equip(abilityId);
    }
  }

  isEquipped(abilityId) {
    return this.equipped.has(abilityId);
  }

  renderUI() {
    let container = document.getElementById('inventory-hud');
    if (!container) {
      container = document.createElement('div');
      container.id = 'inventory-hud';
      container.className = 'inventory-hud';
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <div class="inv-title">Equipped Traversal Components</div>
      <div class="inv-slots">
        ${Array.from(this.abilities.values()).map((ab, idx) => `
          <div class="inv-slot ${this.isEquipped(ab.id) ? 'active' : ''}" data-id="${ab.id}">
            <span class="key">[${idx + 1}]</span>
            <span class="icon">${ab.icon}</span>
            <span class="name">${ab.name}</span>
          </div>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('.inv-slot').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        this.toggle(id);
      });
    });
  }
}
