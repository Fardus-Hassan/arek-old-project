import PetalLoader from '@/components/ui/PetalLoader'

const loading = () => {
  return (
    <div className='flex h-screen w-full justify-center items-center'><PetalLoader size={200} /></div>
  )
}

export default loading