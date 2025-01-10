import React, { useMemo, useState } from 'react';
import './KeysFormSelection.css';
// Sample dynamic keys - in a real app, these might come from an API or props

function KeysFormSelection({
    availableKeys = [],
    onSubmitKeys
}) {

    const allKeys = useMemo(() => availableKeys, [availableKeys]);

    const [selectedKeys, setSelectedKeys] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSelectAll = () => {
        setSelectedKeys([...allKeys]);
    };

    const handleDeselectAll = () => {
        setSelectedKeys([]);
    };

    const handleKeyToggle = (key) => {
        setSelectedKeys(prev =>
            prev.includes(key)
                ? prev.filter(k => k !== key)
                : [...prev, key]
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Here you can handle the submission of selected keys
        onSubmitKeys?.(selectedKeys);
    };

    const filteredKeys = availableKeys.filter(key =>
        key.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="keys-form-selection container">
            <div className="key-selector">
                <div className="header">
                    <h1>
                        <span>Select Keys</span>
                        <hr />
                    </h1>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="controls">
                        <div className="button-group">
                            <button
                                type="button"
                                className="button secondary-button"
                                onClick={handleSelectAll}
                                disabled={selectedKeys.length === allKeys.length}
                            >
                                Select All
                            </button>
                            <button
                                type="button"
                                className="button secondary-button"
                                onClick={handleDeselectAll}
                                disabled={selectedKeys.length === 0}
                            >
                                Deselect All
                            </button>
                        </div>
                        <div className='search-container'>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search keys..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="keys-container">
                        {filteredKeys.map(key => (
                            <div key={key} className={`key-item ${selectedKeys.includes(key) ? 'selected' : ''}`}>
                                <input
                                    type="checkbox"
                                    id={key}
                                    checked={selectedKeys.includes(key)}
                                    onChange={() => handleKeyToggle(key)}
                                />
                                <label htmlFor={key}>{key}</label>
                            </div>
                        ))}
                    </div>

                    <button
                        type="submit" className="button primary-button"
                        disabled={selectedKeys.length === 0}
                    >
                        Submit
                    </button>
                </form>
            </div>
        </div>
    );
}

export default KeysFormSelection;