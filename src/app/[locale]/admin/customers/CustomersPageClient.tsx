'use client'

import { useState, useMemo } from 'react'
import CustomerFilters from './CustomerFilters'
import CustomersTable from '@/components/admin/CustomersTable'
import { CustomerItem } from './page'

interface CustomersPageClientProps {
    initialCustomers: CustomerItem[]
}

export default function CustomersPageClient({ initialCustomers }: CustomersPageClientProps) {
    const [search, setSearch] = useState('')
    const [selectedSource, setSelectedSource] = useState('all')

    const sourceCounts = useMemo(() => {
        return {
            all: initialCustomers.length,
            google: initialCustomers.filter((c) => c.source === 'google').length,
            order: initialCustomers.filter((c) => c.source === 'order').length,
            community: initialCustomers.filter((c) => c.source === 'community').length,
        }
    }, [initialCustomers])

    const displayedCustomers = useMemo(() => {
        return initialCustomers.filter((c) => {
            const matchesSource =
                selectedSource === 'all' || c.source === selectedSource
            return matchesSource
        })
    }, [initialCustomers, selectedSource])

    return (
        <div className="flex flex-col gap-8">
            <CustomerFilters
                search={search}
                setSearch={setSearch}
                totalCount={displayedCustomers.length}
                selectedSource={selectedSource}
                setSelectedSource={setSelectedSource}
                sourceCounts={sourceCounts}
                onAddCustomer={() => {
                    const event = new CustomEvent('open-customer-modal')
                    window.dispatchEvent(event)
                }}
            />
            <div className="w-full">
                <CustomersTable
                    initialCustomers={initialCustomers}
                    externalSearch={search}
                    selectedSource={selectedSource}
                />
            </div>
        </div>
    )
}
