import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: Fetch all penalties
export async function GET() {
  try {
    const { data: penalties, error } = await supabase
      .from('penalties')
      .select('*')
      .order('penalty_date', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ penalties })
  } catch (err) {
    console.error('Error fetching penalties:', err)
    return NextResponse.json({ error: 'Failed to fetch penalties' }, { status: 500 })
  }
}

// POST: Create a new penalty
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, penalty_type, penalty_date, logged_by_user_id, quantity = 1 } = body

    // Validate required fields
    if (!user_id || !penalty_type || !penalty_date) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, penalty_type, penalty_date' },
        { status: 400 }
      )
    }

    // Validate quantity
    if (quantity < 1 || quantity > 10) {
      return NextResponse.json(
        { error: 'Quantity must be between 1 and 10' },
        { status: 400 }
      )
    }

    // Validate penalty_type
    if (!['poptart', 'wine'].includes(penalty_type)) {
      return NextResponse.json(
        { error: 'Invalid penalty_type. Must be "poptart" or "wine"' },
        { status: 400 }
      )
    }

    // Validate day of week (Sunday=0, Monday=1, ..., Thursday=4)
    const date = new Date(penalty_date)
    const dayOfWeek = date.getDay()

    // Sunday (0), Monday (1), Tuesday (2), Wednesday (3), Thursday (4) are valid
    if (dayOfWeek !== 0 && dayOfWeek !== 1 && dayOfWeek !== 2 && dayOfWeek !== 3 && dayOfWeek !== 4) {
      return NextResponse.json(
        { error: 'Balance is key -- enjoy your treat!' },
        { status: 400 }
      )
    }

    const { data: penalty, error } = await supabase
      .from('penalties')
      .insert({
        user_id,
        penalty_type,
        quantity,
        penalty_date,
        logged_by_user_id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ penalty }, { status: 201 })
  } catch (err) {
    console.error('Error creating penalty:', err)
    return NextResponse.json({ error: 'Failed to create penalty' }, { status: 500 })
  }
}
