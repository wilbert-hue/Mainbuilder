'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useDashboardStore } from '@/lib/store'
import { ChevronDown, ChevronRight, Check, Minus } from 'lucide-react'

interface TreeNode {
  name: string
  level: 'global' | 'region' | 'country'
  children: TreeNode[]
}

export function GeographyMultiSelect() {
  const { data, filters, updateFilters } = useDashboardStore()
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['Global']))

  // Auto-expand root nodes when tree first loads
  useEffect(() => {
    if (tree.length > 0) {
      setExpandedNodes(prev => {
        const next = new Set(prev)
        tree.forEach(node => next.add(node.name))
        return next
      })
    }
  }, [tree])
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Build the tree structure from geography hierarchy
  const tree = useMemo((): TreeNode[] => {
    if (!data || !data.dimensions?.geographies) return []

    const hierarchy = data.dimensions.geographies.geography_hierarchy
    const allGeos = data.dimensions.geographies.all_geographies || []

    if (hierarchy && Object.keys(hierarchy).length > 0) {
      // Case 1: Global → Regions → Countries (3-level)
      if (hierarchy['Global']) {
        const globalNode: TreeNode = {
          name: 'Global',
          level: 'global',
          children: (hierarchy['Global'] || []).map(regionName => ({
            name: regionName,
            level: 'region' as const,
            children: (hierarchy[regionName] || []).map(countryName => ({
              name: countryName,
              level: 'country' as const,
              children: [],
            })),
          })),
        }
        return [globalNode]
      }

      // Case 2: Regions → Countries (2-level, no Global root)
      // Root regions = hierarchy keys that are not children of any other key
      const allChildren = new Set(Object.values(hierarchy).flat())
      const rootRegions = Object.keys(hierarchy).filter(k => !allChildren.has(k))

      if (rootRegions.length > 0) {
        // Preserve original ordering from all_geographies when possible
        const orderedRoots = allGeos.filter(g => rootRegions.includes(g))
        const remaining = rootRegions.filter(r => !orderedRoots.includes(r))
        const finalRoots = [...orderedRoots, ...remaining]

        return finalRoots.map(regionName => ({
          name: regionName,
          level: 'region' as const,
          children: (hierarchy[regionName] || []).map(countryName => ({
            name: countryName,
            level: 'country' as const,
            children: [],
          })),
        }))
      }
    }

    // Fallback: flat list (no hierarchy)
    return allGeos.map(geo => ({
      name: geo,
      level: 'global' as const,
      children: [],
    }))
  }, [data])

  // Self + all descendant names (walk subtree) — used for parent indeterminate state
  const getAllDescendants = useCallback((node: TreeNode): string[] => {
    const result = [node.name]
    for (const child of node.children) {
      result.push(...getAllDescendants(child))
    }
    return result
  }, [])

  // Checkbox reflects only this row's geography name — no cascading to/from children or ancestors
  const getCheckState = useCallback((node: TreeNode): 'checked' | 'unchecked' | 'indeterminate' => {
    const selected = filters.geographies

    if (node.children.length === 0) {
      return selected.includes(node.name) ? 'checked' : 'unchecked'
    }

    const selfOn = selected.includes(node.name)
    const descendants = getAllDescendants(node).filter(n => n !== node.name)
    const anyDesc = descendants.some(n => selected.includes(n))
    if (selfOn) return 'checked'
    if (anyDesc) return 'indeterminate'
    return 'unchecked'
  }, [filters.geographies, getAllDescendants])

  const handleToggle = useCallback((node: TreeNode) => {
    const current = new Set(filters.geographies)
    const state = getCheckState(node)
    const name = node.name

    if (state === 'checked') {
      current.delete(name)
    } else {
      current.add(name)
    }

    updateFilters({ geographies: Array.from(current) })
  }, [filters.geographies, getCheckState, updateFilters])

  // Toggle expand/collapse
  const toggleExpand = useCallback((nodeName: string, e?: React.MouseEvent) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(nodeName)) {
        next.delete(nodeName)
      } else {
        next.add(nodeName)
      }
      return next
    })
  }, [])

  // Filter tree based on search term
  const filteredTree = useMemo((): TreeNode[] => {
    if (!searchTerm) return tree

    const search = searchTerm.toLowerCase()

    const filterNode = (node: TreeNode): TreeNode | null => {
      // If this node matches, include it with all children
      if (node.name.toLowerCase().includes(search)) {
        return node
      }

      // Otherwise check if any children match
      const filteredChildren = node.children
        .map(child => filterNode(child))
        .filter((child): child is TreeNode => child !== null)

      if (filteredChildren.length > 0) {
        return { ...node, children: filteredChildren }
      }

      return null
    }

    return tree
      .map(node => filterNode(node))
      .filter((node): node is TreeNode => node !== null)
  }, [tree, searchTerm])

  // Expand all nodes when searching
  useEffect(() => {
    if (searchTerm) {
      const allNodeNames = new Set<string>()
      const collectNames = (nodes: TreeNode[]) => {
        for (const node of nodes) {
          allNodeNames.add(node.name)
          collectNames(node.children)
        }
      }
      collectNames(filteredTree)
      setExpandedNodes(allNodeNames)
    }
  }, [searchTerm, filteredTree])

  // Select all visible geographies
  const handleSelectAll = useCallback(() => {
    if (!data) return
    const allNames = new Set(filters.geographies)
    const collectAllNames = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        allNames.add(node.name)
        collectAllNames(node.children)
      }
    }
    collectAllNames(filteredTree)
    updateFilters({ geographies: Array.from(allNames) })
  }, [data, filters.geographies, filteredTree, updateFilters])

  // Clear all selections
  const handleClearAll = useCallback(() => {
    updateFilters({ geographies: [] })
  }, [updateFilters])

  if (!data) return null

  const selectedCount = filters.geographies.length
  const hasHierarchy = tree.some(n => n.children.length > 0)

  // Render a tree node
  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.name)
    const hasChildren = node.children.length > 0
    const checkState = getCheckState(node)
    const indent = depth * 20

    return (
      <div key={node.name}>
        <div
          className={`flex items-center py-1.5 px-3 hover:bg-blue-50 cursor-pointer ${
            depth > 0 ? 'border-t border-gray-50' : ''
          }`}
          style={{ paddingLeft: `${12 + indent}px` }}
          onClick={() => handleToggle(node)}
        >
          {/* Expand/collapse button */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand(node.name, e)
              }}
              className="mr-1 p-0.5 rounded hover:bg-gray-200 flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
              )}
            </button>
          ) : (
            <span className="mr-1 w-[18px] flex-shrink-0" />
          )}

          {/* Checkbox */}
          <span
            className={`mr-2 h-4 w-4 flex-shrink-0 rounded border flex items-center justify-center ${
              checkState === 'checked'
                ? 'bg-blue-600 border-blue-600'
                : checkState === 'indeterminate'
                ? 'bg-blue-600 border-blue-600'
                : 'border-gray-300 bg-white'
            }`}
          >
            {checkState === 'checked' && (
              <Check className="h-3 w-3 text-white" strokeWidth={3} />
            )}
            {checkState === 'indeterminate' && (
              <Minus className="h-3 w-3 text-white" strokeWidth={3} />
            )}
          </span>

          {/* Label */}
          <span
            className={`text-sm flex-1 ${
              node.level === 'global'
                ? 'font-semibold text-black'
                : node.level === 'region'
                ? 'font-medium text-gray-800'
                : 'text-gray-700'
            }`}
          >
            {node.name}
          </span>

          {/* Count badge for parent nodes */}
          {hasChildren && (
            <span className="text-xs text-gray-400 ml-1">
              ({node.children.length})
            </span>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>

      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
      >
        <span className="text-sm text-black">
          {selectedCount === 0
            ? 'Select geographies...'
            : `${selectedCount} selected`}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b">
            <input
              type="text"
              placeholder="Search geographies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="px-3 py-2 bg-gray-50 border-b flex gap-2">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Select All
            </button>
            <button
              onClick={handleClearAll}
              className="px-3 py-1 text-xs bg-gray-100 text-black rounded hover:bg-gray-200"
            >
              Clear All
            </button>
          </div>

          {/* Geography Tree */}
          <div className="overflow-y-auto max-h-64">
            {filteredTree.length === 0 ? (
              <div className="px-3 py-4 text-sm text-black text-center">
                {searchTerm ? 'No geographies found matching your search' : 'No geographies available'}
              </div>
            ) : (
              filteredTree.map(node => renderNode(node, 0))
            )}
          </div>
        </div>
      )}

      {/* Selected Count Badge */}
      {selectedCount > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-xs text-black">
            {selectedCount} {selectedCount === 1 ? 'geography' : 'geographies'} selected
          </span>
        </div>
      )}
    </div>
  )
}
